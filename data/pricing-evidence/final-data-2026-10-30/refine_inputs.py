"""Recover explicit compact answers before fitting; no ideal defaults are invented.
The 15 Plus report explicitly defines its defaults and the order of its answer
overrides. Other reports use their per-case selected/available values only.
"""
import ast,collections,json,pathlib,re,zipfile
P=pathlib.Path(__file__).parent
tree=ast.parse((P/'audit.py').read_text(encoding='utf-8'))
constants={t.id:ast.literal_eval(n.value)for n in tree.body if isinstance(n,ast.Assign)for t in n.targets if isinstance(t,ast.Name)and t.id in ['HW','PHYSICAL']}
head=re.compile(r'(?im)^(?:(?:for\s+example\s*:|EXAMPLE|SCENARIO|CASE|TEST CASE|REFERENCE)\s*)(\d{1,3})\s*(?:[)/:|.\-—–]|$)[^\n]*')
def selected(value):
 v=value.strip().strip('"').lower()
 if v.startswith(('not asked','not shown','option not','not offered')):return None
 if re.match(r'^(yes|true|available|selected)\b',v):return True
 if re.match(r'^(no|false|unavailable|not selected|not available)\b',v):return False
 return None
def compact_inputs(block,header):
 out={}
 patterns={'calls':r'Calls(?: working)?','touch':r'Touch\s*(?:screen)? working','originalScreen':r'(?:Original screen|Screen original)',
 'box':r'(?:Original box(?: with same IMEI)?|box)','charger':r'Original charger(?: of device)?'}
 for key,pat in patterns.items():
  m=re.search(r'(?im)^[ \t]*'+pat+r'[ \t]*:[ \t]*([^\n]*)',block)
  if m and selected(m[1])is not None:out[key]=selected(m[1])
 details={}
 for category,pat in {'screen':r'Screen physical detail','display':r'Display details \(spots / lines / discoloration\)','body':r'Body details \(scratches / dents\)','panel':r'Panel details \(side/back / bent/loose\)'}.items():
  m=re.search(r'(?im)^[ \t]*'+pat+r'[ \t]*:[ \t]*([^\n]*)',block)
  if m:details[category]=m[1]
 for category,pat in {'screen':r'Screen physical condition','display':r'(?:Display spots|Display lines|Visible lines|Discoloration)','body':r'(?:Body scratches|Body dents)','panel':r'(?:Side/back panel|Bent device / loose screen)'}.items():
  values=[m[1]for m in re.finditer(r'(?im)^[ \t]*'+pat+r'[ \t]*:[ \t]*([^\n]*)',block)]
  if values:details[category]=details.get(category,'')+'; '+'; '.join(v for v in values if not v.lower().startswith(('not asked','not selected')))
 if details:
  codes=[]
  for code,names in constants['PHYSICAL'].items():
   category='screen'if code.startswith('S')else'display'if code.startswith('D')else'body'if code.startswith('C')else'panel'
   value=details.get(category,'')
   if not value.lower().startswith(('not asked','not selected','none'))and any(n.lower()in value.lower()for n in names):codes.append(code)
  out['physical_codes']=sorted(set(codes))
 age=re.search(r'(?im)^[ \t]*Actual age selection[ \t]*:[ \t]*([^\n]*)',block)
 if age:
  value=age[1].strip().strip('"')
  out['age']=value if value in ['Below 3 months','3 months - 6 months','6 months - 11 months','Above 11 months']else None
 # These defaults are an explicit collection instruction in this specific
 # report, not an assumption about other datasets or future reports.
 if 'Default submitted answers where no override is listed: calls Yes, touchscreen Yes, original screen Yes, Indian warranty Yes, valid GST bill Yes.'in header:
  for key in ['calls','touch','originalScreen','warranty','validBill']:out[key]=True
  values={}
  for m in re.finditer(r'(?m)^([a-z][A-Za-z_]*):[ \t]*(.*)$',block):
   try:values[m[1]]=json.loads(m[2])
   except json.JSONDecodeError:pass
  if 'answers'in values:
   assert len(values['answers'])==5
   for key,value in zip(['calls','touch','originalScreen','warranty','validBill'],values['answers']):
    assert selected(value)is not None;out[key]=selected(value)
  if isinstance(values.get('box'),bool):out['box']=values['box']
  if 'age'in values:out['age']=None if str(values['age']).lower()=='not asked'else values['age']
  codes=[]
  for code,names in constants['HW'].items():
   if any(any(n.lower()in str(value).lower()for n in names)for value in values.get('defects',[])):codes.append(code)
  for code,names in constants['PHYSICAL'].items():
   fields=['screen']if code.startswith('S')else ['spots','lines','color']if code.startswith('D')else ['scratches','dents']if code.startswith('C')else ['panel','bent']
   if any(str(values.get(field,'')).lower()==n.lower()for field in fields for n in names):codes.append(code)
  out['codes']=sorted(set(codes))
 return out
if __name__=='__main__':
 s=json.loads((P/'summary.json').read_text(encoding='utf-8'));root=pathlib.Path(s['source'])
 rows=[json.loads(l)for l in(P/'case-records.jsonl').read_text(encoding='utf-8').splitlines()]
 cache={};changes=[]
 for r in rows:
  if r['status']!='priced':continue
  for src in r['sources']:
   key=(src['archive'],src['member'])
   if key not in cache:
    with zipfile.ZipFile(root/key[0])as z:text=z.read(key[1]).decode('utf-8-sig',errors='replace').replace('\r\n','\n')
    starts=list(head.finditer(text));cache[key]=(text[:1400],{text[:m.start()].count('\n')+1:text[m.start():starts[i+1].start()if i+1<len(starts)else len(text)]for i,m in enumerate(starts)})
   header,blocks=cache[key];block=blocks[src['line']].split('Observed quote-page evidence:')[0]
   for field,value in compact_inputs(block,header).items():
    if field=='physical_codes':field='codes';value=sorted(set(r['inputs']['codes'])|set(value))
    old=r['inputs'][field]
    if old==value:continue
    # Only the explicit compact schema may replace prior incomplete code/age
    # extraction. A contradictory known boolean from any mirror remains an error.
    assert old is None or field in ['codes','age'],(r['model'],r['case_id'],field,old,value)
    r['inputs'][field]=value
    changes.append({'model':r['model'],'storage_gb':r['storage_gb'],'case_id':r['case_id'],'field':field,'old':old,'value':value,'source':src})
 (P/'case-records.jsonl').write_text(''.join(json.dumps(r,ensure_ascii=False)+'\n'for r in rows),encoding='utf-8')
 (P/'compact-input-refinements.json').write_text(json.dumps(changes,indent=2,ensure_ascii=False),encoding='utf-8')
 print('Explicit compact answer fields recovered:',len(changes))
