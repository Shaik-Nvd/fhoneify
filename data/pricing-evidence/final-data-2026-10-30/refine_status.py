"""Resolve explicitly pending case headings in the new compact report format.
No numeric price or selected answer is changed. Raw files stay immutable.
"""
import collections,json,pathlib,re,zipfile
P=pathlib.Path(__file__).parent
s=json.loads((P/'summary.json').read_text(encoding='utf-8'))
root=pathlib.Path(s['source'])
rows=[json.loads(l)for l in(P/'case-records.jsonl').read_text(encoding='utf-8').splitlines()]
cache={};changes=[]
for r in rows:
 if r['selling']is not None or r['status']=='pending':continue
 for src in r['sources']:
  key=(src['archive'],src['member'])
  if key not in cache:
   with zipfile.ZipFile(root/key[0])as z:cache[key]=z.read(key[1]).decode('utf-8-sig',errors='replace').splitlines()
  heading=cache[key][src['line']-1]
  if re.search(r'(?i)\bPENDING\b',heading):
   changes.append({'model':r['model'],'storage_gb':r['storage_gb'],'case_id':r['case_id'],'source':src,'heading':heading,'old_status':r['status']})
   r['status']='pending';r['status_basis']='explicit_pending_case_heading'
   break
s['statuses']=dict(collections.Counter(r['status']for r in rows))
for m in s['by_model']:m['statuses']=dict(collections.Counter(r['status']for r in rows if r['model']==m['model']))
(P/'case-records.jsonl').write_text(''.join(json.dumps(r,ensure_ascii=False)+'\n'for r in rows),encoding='utf-8')
(P/'summary.json').write_text(json.dumps(s,indent=2,ensure_ascii=False),encoding='utf-8')
if changes:(P/'status-refinements.json').write_text(json.dumps(changes,indent=2,ensure_ascii=False),encoding='utf-8')
print('Explicit pending headings refined:',len(changes))
