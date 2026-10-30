import ast,collections,hashlib,json,pathlib,re,zipfile
P=pathlib.Path(__file__).parent
inv=json.loads((P/'source-inventory.json').read_text(encoding='utf-8'))
summary=json.loads((P/'summary.json').read_text(encoding='utf-8'))
rows=[json.loads(l)for l in(P/'case-records.jsonl').read_text(encoding='utf-8').splitlines()]
source=pathlib.Path(summary['source'])
for f in inv:assert hashlib.sha256((source/f['file']).read_bytes()).hexdigest()==f['sha256'],'source file changed'
assert summary['json_matches']==summary['json_numeric_rows']>0
assert not summary['json_mismatches'] and not summary['json_unmatched']
assert all(r['storage_gb']for r in rows if r['status']=='priced')
assert not [w for r in rows for w in r['warnings']]
assert not [r for r in rows if r['input_conflicts']], 'Unresolved complementary-export input conflicts'
lookup=collections.defaultdict(set)
payout_lookup=collections.defaultdict(set)
input_lookup=collections.defaultdict(list)
for r in rows:
 for s in r['sources']:
  lookup[(s['archive'],s['member'],r['storage_gb'],r['case_id'])].add(r['selling'])
  payout_lookup[(s['archive'],s['member'],r['storage_gb'],r['case_id'])].add(r['payout'])
  input_lookup[(s['archive'],r['storage_gb'],r['case_id'],r['selling'])].append(r)
tree=ast.parse((P/'audit.py').read_text(encoding='utf-8'))
hardware=next(ast.literal_eval(n.value)for n in tree.body if isinstance(n,ast.Assign)and any(isinstance(t,ast.Name)and t.id=='HW'for t in n.targets))
input_checks=0
for f in inv:
 if not f['file'].endswith('.zip')or f['duplicate_of']:continue
 with zipfile.ZipFile(source/f['file'])as z:
  for name in z.namelist():
   if not name.endswith('.json'):continue
   obj=json.loads(z.read(name).decode('utf-8-sig'))
   if not isinstance(obj,list):continue
   for item in obj:
    case=item.get('id',item.get('sourceCase',item.get('caseId')))
    price=item.get('selling',item.get('sellingPriceINR',item.get('sellingPrice')))
    if not str(case).isdigit()or price is None:continue
    v=str(item.get('variant',item.get('variant_GB',item.get('model',name))))
    caps=re.findall(r'(\d+)\s*(GB|TB)',v,re.I)
    gb=int(caps[-1][0])*(1024 if caps[-1][1].lower()=='tb'else 1)if caps else int(v)if v.isdigit()else None
    if gb is None:
     caps=re.findall(r'(\d+)\s*(GB|TB)',name,re.I)
     if caps:gb=int(caps[-1][0])*(1024 if caps[-1][1].lower()=='tb'else 1)
    matches=input_lookup[(f['file'],gb,str(int(case)),price)]
    assert matches, (f['file'],name,case,gb)
    for field,raw in [('originalScreen',item.get('original')),('box',item.get('box',item.get('originalBox'))),('calls',item.get('calls')),('touch',item.get('touch'))]:
     if not isinstance(raw,bool):continue
     assert all(r['inputs'][field]==raw for r in matches),(f['file'],case,field,raw)
     input_checks+=1
    if isinstance(item.get('faults'),list):
     expected=sorted(code for code,names in hardware.items()if any(any(n.lower()in str(fault).lower()for n in names)for fault in item['faults']))
     assert all([c for c in r['inputs']['codes']if c.startswith('F')]==expected for r in matches),(f['file'],case,expected)
     input_checks+=1
checked=0;failures=[]
for f in inv:
 if not f['file'].endswith('.zip')or f['duplicate_of']:continue
 with zipfile.ZipFile(source/f['file'])as z:
  for n in z.namelist():
   if not n.endswith('.txt'):continue
   t=z.read(n).decode('utf-8-sig',errors='replace');storage=None;column=None
   for number,line in enumerate(t.splitlines(),1):
    if re.search(r'(?i)(?:iphone|galaxy\s*z\s*fold|variant:)',line)and '('in line:
     c=re.findall(r'(\d+)\s*(GB|TB)',line,re.I)
     if c:storage=int(c[-1][0])*(1024 if c[-1][1].lower()=='tb'else 1)
    if '|'not in line:continue
    cells=[v.strip()for v in line.split('|')]
    if cells[0].lower().startswith(('case','reference','source reference')):
     column=next((i for i,c in enumerate(cells)if re.match(r'(?i)^selling(?: price)?$',c)),None)
     continue
    if column is None or storage is None or not re.fullmatch(r'\d{1,3}',cells[0]):continue
    if len(cells)<=column:continue
    m=re.fullmatch(r'(?:INR\s*|₹\s*)?([\d,]+)',cells[column])
    if not m:continue
    price=int(m[1].replace(',',''));key=(f['file'],n,storage,str(int(cells[0])))
    if price not in lookup[key]:failures.append({'archive':f['file'],'member':n,'line':number,'storage':storage,'case':cells[0],'table_price':price,'case_price':sorted(v for v in lookup[key]if v is not None)})
    checked+=1
assert checked>0,checked
assert not failures,failures[:10]
matrix_checks=0
for f in inv:
 if not f['file'].endswith('.zip')or f['duplicate_of']:continue
 with zipfile.ZipFile(source/f['file'])as z:
  for n in z.namelist():
   if not n.endswith('.txt'):continue
   columns={};basis='selling'
   for number,line in enumerate(z.read(n).decode('utf-8-sig',errors='replace').splitlines(),1):
    if 'FINAL PAYOUT COMPARISON' in line.upper():basis='payout'
    if 'SELLING' in line.upper()and('COMPARISON'in line.upper()or'CASE INDEX'in line.upper()):basis='selling'
    cells=[v.strip()for v in line.split('\t'if '\t'in line else '|')]
    if len(cells)<3:continue
    if re.fullmatch(r'(?i)(?:Ref|Reference|Case)',cells[0]):
     columns={i:int(m[1])*(1024 if m[2].upper()=='TB'else 1)for i,c in enumerate(cells)if(m:=re.fullmatch(r'(\d+)\s*(GB|TB)',c,re.I))}
     continue
    case=re.match(r'^(\d{1,3})(?:\.|$)',cells[0])
    if not columns or not case:continue
    for i,gb in columns.items():
     if i>=len(cells):continue
     m=re.match(r'^(?:INR\s*|₹\s*)([\d,]+)(?:\s*/|$)',cells[i])
     if not m:continue
     amount=int(m[1].replace(',',''))
     key=(f['file'],n,gb,str(int(case[1])))
     candidates=(payout_lookup if basis=='payout'else lookup)[key]
     assert amount in candidates,(f['file'],n,number,gb,case[1],basis,amount,candidates)
     matrix_checks+=1
assert matrix_checks>0
priced=[r for r in rows if r['status']=='priced']
fees=[r for r in priced if all(r[k]is not None for k in ['base','selling','imei','processing','payout'])]
assert all(r['base']-r['imei']==r['selling']and r['base']-r['imei']-r['processing']==r['payout']for r in fees)
result={'source_hashes_verified':len(inv),'json_price_crosschecks':summary['json_matches'],'json_input_field_crosschecks':input_checks,'independent_summary_table_checks':checked,'independent_storage_matrix_checks':matrix_checks,'complete_fee_arithmetic_checks':len(fees),'table_mismatches':failures,'priced_cases':len(priced),'unresolved_input_conflicts':summary['input_conflict_records'],'complementary_input_enrichments':summary['input_enriched_records']}
(P/'verification.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
print(json.dumps(result,indent=2))
