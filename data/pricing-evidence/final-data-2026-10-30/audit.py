"""Read-only audit of new Cashify reports. ZIP contents are data, never executed.
No database, pricing-code mutation, or production requests.
"""
import collections, datetime, hashlib, json, pathlib, re, statistics, sys, zipfile

sys.stdout.reconfigure(encoding='utf-8')
SOURCE = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else pathlib.Path('pricing-inputs/final-iphone')
OUT = pathlib.Path(__file__).parent
OUT.mkdir(exist_ok=True)

def digest(b): return hashlib.sha256(b).hexdigest()
def money(v):
    if isinstance(v, (int, float)): return int(v)
    m = re.search(r'\d[\d,]*', str(v or ''))
    return int(m[0].replace(',', '')) if m else None

def model_name(name):
    s = name.replace('_', ' ')
    if 'Galaxy' in s:
        m = re.search(r'Fold\s*(\d+)(Ultra)?', s, re.I)
        return f'Samsung Galaxy Z Fold {m[1]}'+(' Ultra' if m[2] else '')
    m = re.search(r'iPhone\s*(SE\s*(?:1st\s*Generation|2020|2022)|\d+[sSeE]?(?:\s*(?:Pro\s*Max|Pro|Plus|Mini))?|XS\s*Max|XS|XR|X|Air)', s, re.I)
    if not m: return None
    v = re.sub(r'(?<=[a-zA-Z])(?=[A-Z][a-z])', ' ', m[1])
    v = re.sub(r'(?<=\d)(?=[A-Z])', ' ', v)
    v = re.sub(r'(?i)pro\s*max', 'Pro Max', v)
    for a,b in [('pro','Pro'),('plus','Plus'),('mini','Mini'),('air','Air'),('se','SE'),('xs','XS'),('xr','XR')]:
        v = re.sub(r'(?i)\b'+a+r'\b', b, v)
    v = re.sub(r'(?i)1st\s*generation', '1st Generation', v)
    v = re.sub(r'(?i)(\d+)s\b', lambda m:m[1]+'S', v)
    v = re.sub(r'(?i)(\d+)e\b', lambda m:m[1]+'e', v)
    v=re.sub(r'(?i)^(\d+)\s+S\b',r'\1S',v)
    v=re.sub(r'(?i)^SE\s*(2020|2022|1st)',r'SE \1',v)
    return 'iPhone '+re.sub(r'\s+', ' ', v).strip()

def capacity(text):
    hits=re.findall(r'(\d+)\s*(GB|TB)',text,re.I)
    return int(hits[-1][0])*(1024 if hits[-1][1].lower()=='tb' else 1) if hits else None

HW = {
 'F01':['Front Camera not working'], 'F02':['Back Camera not working'], 'F03':['Volume Button not working'],
 'F04':['Finger Touch not working','Fingerprint sensor not working'], 'F05':['WiFi not working','Wi-Fi not working'],
 'F06':['Speaker Faulty','Speaker not working'], 'F07':['Silent Button not working'], 'F08':['Face Sensor not working'],
 'F09':['Power Button not working'], 'F10':['Charging Port not working'], 'F11':['Audio Receiver not working'],
 'F12':['Camera Glass Broken'], 'F13':['Microphone not working'], 'F14':['Bluetooth not working'],
 'F15':['Vibrator is not working','Vibrator not working'], 'F16':['Proximity Sensor not working'],
 'F17':['Battery in Service','Battery Faulty'], 'F18':['Battery Health 80-85%','Battery health 80–85%'],
}
PHYSICAL = {
 'S01':['Screen cracked/ glass broken'], 'S02':['Chipped/cracked outside display area'],
 'S03':['More than 2 scratches on screen'], 'S04':['1-2 scratches on screen'],
 'D01':['Large/ heavy visible spots on screen'], 'D02':['3 or more minor spots on screen'], 'D03':['1-2 minor spots on screen'],
 'D04':['Visible line(s) on display'], 'D05':['Display faded along edges'], 'D06':['Major Discoloration'], 'D07':['Minor Discoloration'],
 'C01':['More than 2 scratches'], 'C02':['1-2 scratches'], 'C03':['Major dent(s) or more than 2'], 'C04':['1-2 minor dents'],
 'P01':['Cracked/ broken side or back panel'], 'P02':['Missing side or back panel'], 'P03':['Bent/ curved panel'], 'P04':['Loose screen (Gap in screen and body)'],
}

HEAD = re.compile(r'(?im)^(?:(?:for\s+example\s*:|EXAMPLE|SCENARIO|CASE|TEST CASE|REFERENCE)\s*)(\d{1,3})\s*(?:[)/:|.\-—–]|$)[^\n]*')
PRICE_PAT = {
 'selling':r"(?:(?:Cashify(?:['’]s)?|Verified)\s+)?(?:final\s+)?Selling\s*price(?:\s*\([^\n]*?\))?",
 'base':r'(?:Price Summary\s*[—–-]\s*)?Base\s*price', 'imei':r'IMEI(?:\s+validation)?\s*fee',
 'processing':r'Processing\s*fee',
 'payout':r'(?:Price Summary\s*[—–-]\s*)?(?:FINAL QUOTED PAYOUT(?:\s*\(Total Amount\))?|Total\s*(?:payout|amount)(?:\s*(?:after fees|/ net total))?|Final\s*(?:quoted\s*)?payout|Final total)',
}

def price_field(text, key):
    # Anchored labels prevent percentages, source-template prices and summary tables becoming quotations.
    m=re.search(r'(?im)^\s*'+PRICE_PAT[key]+r'\s*:\s*[-−]?\s*(?:INR|Rs\.?|₹)?\s*([\d][\d,]*)\b', text)
    return money(m[1]) if m else None

def bool_field(text, patterns):
    for pattern in patterns:
        m=re.search(pattern+r'\s*[:?]?\s*(Yes|No|True|False|Not\s+(?:shown|asked|offered)|Option not shown)\b', text,re.I)
        if m: return True if m[1].lower() in ['yes','true'] else False if m[1].lower() in ['no','false'] else None
    return None

def line_value(text, pattern):
    m=re.search(r'(?im)^[ \t]*'+pattern+r'[ \t]*:[ \t]*([^\n]*)', text)
    return m[1].strip() if m else None

def inputs_from_text(t):
    out={
      'calls':bool_field(t,[r'Calls(?: working)?',r'(?:Are you able to make and receive calls)\?\s*(?:Check your device for cellular network connectivity issues\s*:\s*)?']),
      'touch':bool_field(t,[r'Touch(?: screen)? working',r"Is your device.s touch screen working properly\?"]),
      'originalScreen':bool_field(t,[r'Original screen',r"Is your phone.s screen original\?"]),
      'warranty':bool_field(t,[r'Manufacturer warranty(?:\s*\(initial selection\))?',r'Is your device under manufacturer warranty\?']),
      'validBill':bool_field(t,[r'GST valid bill(?:,? with|,)?\s*(?:the\s+)?same IMEI(?:\s*\(initial selection\))?',r'Do you have (?:a )?GST[- ]valid bill with the same IMEI\?']),
      'box':bool_field(t,[r'Original box(?: with same IMEI)?',r'Original box available']),
      'charger':bool_field(t,[r'Original charger(?: of device)?']),
      'age':None,'esim':None,
    }
    shared=re.search(r'(?i)Calls / touch / original screen / warranty / GST bill:\s*(Yes|No)\s*/\s*(Yes|No)\s*/\s*(Yes|No)\s*/\s*(Yes|No)\s*/\s*(Yes|No)',t)
    if shared:
        for key,value in zip(['calls','touch','originalScreen','warranty','validBill'],shared.groups()):out[key]=value.lower()=='yes'
    if out['box'] is None:out['box']=bool_field(t,[r'original box'])
    # Short reports use direct labels; full questionnaires use selected options.
    age=line_value(t,r'(?:Mobile age(?: selected)?|Age selected|Age selection|Mobile age chosen|Age)')
    if age and not re.search(r'(?i)not (?:shown|asked|selected)|skipp|unavailable|not applicable|omitted',age): out['age']=age
    semicolon_age=re.search(r'(?im)(?:^|;)\s*age\s*:\s*([^;\n]+)',t)
    if semicolon_age and not re.search(r'(?i)not|skip|unknown',semicolon_age[1]):out['age']=semicolon_age[1].strip()
    for name in ['Below 3 months','3 months - 6 months','6 months - 11 months','Above 11 months']:
        if re.search(re.escape(name)+r'\s*:\s*Selected\b',t,re.I):out['age']=name
    if re.search(r'(?i)(?:eSIM(?: selection)?\s*:\s*|support\?\s*)(Dual eSIM|Single eSIM)',t):
        out['esim']=re.search(r'(?i)(?:eSIM(?: selection)?\s*:\s*|support\?\s*)(Dual eSIM|Single eSIM)',t)[1].lower()
    codes=[]
    faultline=line_value(t,r'(?:Functional faults(?: selected)?|Functional problems|Functional or Physical Problems)') or ''
    selectedline=line_value(t,r'Reference selected conditions') or ''
    header=t.splitlines()[0] if t.splitlines() else ''
    if not faultline and not line_value(t,r'Other selections') and not re.search(r'(?i)Front Camera not working\s*:\s*(?:Not selected|Selected)',t):
        for code,names in HW.items():
            if any(name.lower() in header.lower() for name in names):codes.append(code)
    other=line_value(t,r'Other selections')
    if other:
        try:
            selected=json.dumps(json.loads(other),ensure_ascii=False)
            for code,names in (HW|PHYSICAL).items():
                if any(re.search(re.escape(name)+(r'(?! on screen)' if code in ['C01','C02'] else ''),selected,re.I) for name in names):codes.append(code)
        except ValueError:pass
    for code,names in (HW|PHYSICAL).items():
        for name in names:
            if re.search(re.escape(name)+r'(?:\s*\([^\n]*?\))?\s*:\s*(?:Selected|Yes)\b',t,re.I): codes.append(code);break
            if code.startswith('F') and not faultline.lower().startswith(('none','not selected','not shown','not offered')) and re.search(re.escape(name),faultline,re.I):codes.append(code);break
    # Compact category descriptions: match only their recorded values, never explanatory headings.
    compact={
      'screen':line_value(t,r'Screen (?:(?:physical )?condition|physical defects)') or '',
      'display':line_value(t,r'Display spots / lines / discoloration') or '',
      'body':line_value(t,r'Body scratches / dents') or '',
      'panel':line_value(t,r'(?:Panel condition / bent or loose screen|Panel / bent / loose screen)') or '',
    }
    if re.search(r'(?i)more than 2',compact['screen']):codes.append('S03')
    elif re.search(r'(?i)1[-–]2',compact['screen']):codes.append('S04')
    for code,names in PHYSICAL.items():
        field='screen' if code.startswith('S') else 'display' if code.startswith('D') else 'body' if code.startswith('C') else 'panel'
        for name in names:
            # Body scratch strings are prefixes of screen strings: category-specific matching is intentional.
            if name.lower() in compact[field].lower() and not compact[field].lower().startswith(('none','category not')): codes.append(code);break
    for code,names in PHYSICAL.items():
        field_value=line_value(t,r'Body scratches') if code in ['C01','C02'] else line_value(t,r'(?:Body dents|Dents)') if code in ['C03','C04'] else None
        if field_value and any(n.lower() in field_value.lower() for n in names):codes.append(code)
    out['codes']=sorted(set(codes))
    return out

def parse_text(text, archive, member, model):
    text=text.replace('\r\n','\n'); matches=list(HEAD.finditer(text)); rows=[]
    family='reference58' if any(int(m[1])==0 for m in matches) or re.search(r'(?i)reference\s+00',text) else 'combination30'
    # The compact individual-condition export renumbers cases rather than
    # retaining source IDs: e.g. its case 15 is vibrator, reference 15 is mic.
    if 'INDIVIDUAL CONDITION CASES' in text[:250].upper():
        family='individual_condition'
    context=[]
    for m in re.finditer(r'(?im)^.{0,25}(?:iPhone|GALAXY\s*Z\s*FOLD|VARIANT\s*:)[^\n]*',text):
        s=m[0]
        if '(' in s or s.upper().startswith('VARIANT:'):
            gb=capacity(s)
            if gb:context.append((m.start(),gb))
    for idx,m in enumerate(matches):
        end=matches[idx+1].start() if idx+1<len(matches) else len(text)
        block=text[m.start():end]
        # Ending control summaries aren't another quoted case.
        block=re.split(r'(?im)^FINAL BASELINE RECHECKS|^ENDING BASELINE RECHECKS|^BASELINE RECHECKS',block)[0]
        case=m[1]
        # Only the numbered "CASE 001 / 232 - Reference 00" layout has a separate source ID.
        # "EXAMPLE 24 (repeat of reference 23)" must retain ID24.
        ref=re.search(r'(?i)\bReference\s+(\d+)\b',m[0]) if re.match(r'(?i)^CASE\s+\d+\s*/\s*\d+',m[0]) else None
        case=ref[1] if ref else case
        first_price=re.search(r'(?im)^\s*'+PRICE_PAT['selling']+r'\s*:',block)
        identity_part=block[:first_price.start()] if first_price else block
        own=re.search(r'(?im)^(?:Device:\s*)?(?:Apple\s+)?iPhone[^\n]*\([^\n]*\)',identity_part)
        gb=capacity(own[0]) if own else None
        if gb is None:
            prior=[v for pos,v in context if pos<m.start()]
            gb=prior[-1] if prior else None
        if gb is None:
            # A per-variant filename can supply capacity, but never a multi-variant filename.
            caps=re.findall(r'(?i)(\d+)\s*(GB|TB)',member)
            if len(caps)==1:gb=capacity(member)
        values={k:price_field(block,k) for k in PRICE_PAT}
        row={'model':model,'storage_gb':gb,'case_id':str(int(case)),'family':family,**values,'inputs':inputs_from_text(block),
             'status':'priced' if values['selling'] is not None else 'pending' if re.search(r'(?i)not yet tested|quote pending|not verified.*pending|unresolved',block) else 'unavailable',
             'status_text':line_value(block,'Status'),'archive':archive,'member':member,'line':text[:m.start()].count('\n')+1,
             'date':None,'source_kind':'txt','raw_sha256':digest(block.encode()),'warnings':[]}
        date=re.search(r'(?i)(?:Test date|Observed|Date|Checked|Live quote collection|Live Cashify assessment run)\s*:\s*(\d{1,2})\s+October\s+(2026)',text[:1000])
        if not date:date=re.search(r'(?i)(?:Tested)\s+(\d{1,2})\s+October\s+(2026)',text[:1000])
        row['date']=f'2026-10-{int(date[1]):02}' if date else None
        timestamp=re.search(r'(?i)(?:Observed(?: at)?(?:\s*\(UTC\)| UTC)?|ObservedAt)\s*:\s*(2026-\d\d-\d\dT[\d:.]+Z)',block)
        row['observed_at']=timestamp[1] if timestamp else None
        if timestamp and not row['date']:
            row['date']=datetime.datetime.fromisoformat(timestamp[1].replace('Z','+00:00')).astimezone(datetime.timezone(datetime.timedelta(hours=5,minutes=30))).date().isoformat()
        if values['selling'] is not None and gb is None:row['warnings'].append('missing_storage')
        rows.append(row)
    return rows

files=[];occurrences=[];archive_seen={};warnings=[];json_rows=[];member_seen={}
for f in sorted(SOURCE.iterdir()):
    if not f.is_file():continue
    data=f.read_bytes();h=digest(data);info={'file':f.name,'sha256':h,'bytes':len(data),'duplicate_of':archive_seen.get(h),'members':[]}
    archive_seen.setdefault(h,f.name)
    if f.suffix.lower()!='.zip':
        info['role']='reference_template' if f.name=='All Individualtxt.txt' else 'standalone_export'
        files.append(info);continue
    model=model_name(f.name);info['model']=model
    with zipfile.ZipFile(f) as z:
        texts=[]
        for n in z.namelist():
            if n.endswith('/'):continue
            b=z.read(n);mh=digest(b);mi={'name':n,'sha256':mh,'bytes':len(b),'duplicate_of':member_seen.get(mh)}
            member_seen.setdefault(mh,[f.name,n]);info['members'].append(mi)
            if n.lower().endswith('.txt'):texts.append((n,b.decode('utf-8-sig',errors='replace')))
            if n.lower().endswith('.json') and not info['duplicate_of']:
                try:
                    obj=json.loads(b.decode('utf-8-sig'))
                    if isinstance(obj,dict) and all(isinstance(v,dict) for v in obj.values()):
                        obj=[{'variant':storage,'id':case,'selling':price} for storage,values in obj.items() for case,price in values.items() if isinstance(price,(int,float))]
                    if isinstance(obj,list):
                        for r in obj:
                            if isinstance(r,dict):json_rows.append({'archive':f.name,'member':n,'model':model,'row':r})
                except Exception as e:warnings.append({'archive':f.name,'member':n,'error':str(e)})
        # Parse all TXT representations: some archives have only one member per variant.
        # Cross-export case dedup below prevents combined and per-variant mirrors inflating counts.
        if info['duplicate_of']:
            prior=next(x for x in files if x['file']==info['duplicate_of'])
            info['parsed_cases']=prior.get('parsed_cases',0)
            info['priced_cases']=prior.get('priced_cases',0)
        elif texts:
            print('Parsing '+f.name, file=sys.stderr, flush=True)
            rows=[]
            for n,t in texts:
                if n.lower()=='readme.txt':continue
                rows.extend(parse_text(t,f.name,n,model))
            info['parsed_cases']=len(rows);info['priced_cases']=sum(r['status']=='priced' for r in rows)
            if not info['duplicate_of']:occurrences.extend(rows)
        else:info['parsed_cases']=0
    files.append(info)

# JSON numeric rows independently cross-check TXT case tables. Supplemental JSON-only rows are identified separately.
json_checks=[]
occ_index=collections.defaultdict(list)
for r in occurrences:occ_index[(r['archive'],r['storage_gb'],r['case_id'])].append(r)
for item in json_rows:
    r=item['row']; selling=r.get('selling',r.get('sellingPriceINR',r.get('sellingPrice')))
    if selling is None:continue
    case=r.get('id',r.get('sourceCase',r.get('caseId')))
    if case=='baseline_recheck':continue
    model=item['model'];gb=capacity(str(r.get('variant',r.get('variant_GB',r.get('model','')))))
    if gb is None and str(r.get('variant_GB','')).isdigit():gb=int(r['variant_GB'])
    if gb is None:gb=capacity(item['member'])
    matches=occ_index[(item['archive'],gb,str(int(case)))] if str(case).isdigit() else []
    json_checks.append({'archive':item['archive'],'member':item['member'],'model':model,'storage_gb':gb,'case_id':str(case),'selling':selling,
                        'matched':len(matches),'same':bool(matches) and all(x['selling']==selling for x in matches)})

# Combined and per-storage mirrors can omit the session date in a member header.
# Inherit only an unambiguous date from the same archive; never across archives.
archive_dates=collections.defaultdict(set)
for r in occurrences:
    if r['date']:archive_dates[r['archive']].add(r['date'])
for r in occurrences:
    if r['date'] is None and len(archive_dates[r['archive']])==1:
        r['date']=next(iter(archive_dates[r['archive']]))
        r['date_basis']='same_archive_single_session'

# Deduplicate copies of cases at the same model/storage/date/case/value, retaining every source pointer.
canonical={}
for r in occurrences:
    k=(r['model'],r['storage_gb'],r['date'],r['family'],r['case_id'],r['selling'],r['status'])
    if k not in canonical:canonical[k]={**r,'inputs':dict(r['inputs']),'sources':[],'input_conflicts':[],'input_enrichments':[]}
    else:
        target=canonical[k]
        for field,value in r['inputs'].items():
            old=target['inputs'][field]
            if old is None and value is not None:
                target['inputs'][field]=value
                target['input_enrichments'].append({'field':field,'source':{p:r[p] for p in ['archive','member','line']}})
            elif field=='codes' and old!=value:
                # Keep source complements visible. Never silently overwrite a genuinely different nonempty selection.
                if not old and value:
                    target['inputs'][field]=value
                    target['input_enrichments'].append({'field':field,'source':{p:r[p] for p in ['archive','member','line']}})
                elif old and value:
                    target['input_conflicts'].append({'field':field,'left':old,'right':value,'source':{p:r[p] for p in ['archive','member','line']}})
            elif old is not None and value is not None and old!=value:
                target['input_conflicts'].append({'field':field,'left':old,'right':value,'source':{p:r[p] for p in ['archive','member','line']}})
        if not target['observed_at'] and r['observed_at']:target['observed_at']=r['observed_at']
    canonical[k]['sources'].append({k:r[k] for k in ['archive','member','line']})
records=list(canonical.values())
for r in records:
    if r['selling'] is not None:
        if r['base'] is not None and r['imei'] is not None and r['base']-r['imei']!=r['selling']:r['warnings'].append('selling_fee_arithmetic_mismatch')
        if all(r[k] is not None for k in ['base','imei','processing','payout']) and r['base']-r['imei']-r['processing']!=r['payout']:r['warnings'].append('payout_fee_arithmetic_mismatch')

summary={'source':str(SOURCE),'files':len(files),'zip_files':sum(f['file'].endswith('.zip') for f in files),
 'unique_zip_files':len({f['sha256'] for f in files if f['file'].endswith('.zip')}),
 'primary_txt_occurrences':len(occurrences),'records_after_case_export_dedup':len(records),'statuses':dict(collections.Counter(r['status'] for r in records)),
 'json_numeric_rows':len(json_checks),'json_matches':sum(x['same'] for x in json_checks),
 'json_mismatches':[x for x in json_checks if x['matched'] and not x['same']],
 'json_unmatched':sum(not x['matched'] for x in json_checks),'warnings':warnings,
 'input_conflict_records':sum(bool(r['input_conflicts'])for r in records),
 'input_enriched_records':sum(bool(r['input_enrichments'])for r in records),
 'by_model':[]}
for model in sorted({r['model'] for r in records},key=lambda s:s or ''):
    rr=[r for r in records if r['model']==model]
    summary['by_model'].append({'model':model,'variants':sorted({r['storage_gb'] for r in rr if r['storage_gb']}),'statuses':dict(collections.Counter(r['status'] for r in rr))})

(OUT/'source-inventory.json').write_text(json.dumps(files,indent=2,ensure_ascii=False),encoding='utf-8')
(OUT/'case-records.jsonl').write_text(''.join(json.dumps(r,ensure_ascii=False)+'\n' for r in records),encoding='utf-8')
(OUT/'json-crosschecks.json').write_text(json.dumps(json_checks,indent=2),encoding='utf-8')
(OUT/'summary.json').write_text(json.dumps(summary,indent=2,ensure_ascii=False),encoding='utf-8')
print(json.dumps(summary,indent=2,ensure_ascii=False))
