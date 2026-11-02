"""Fill omitted fee fields from complementary source representations.
Any disagreement between known amounts is an explicit blocking conflict.
"""
import ast,json,pathlib,zipfile,re
P=pathlib.Path(__file__).parent
tree=ast.parse((P/'audit.py').read_text(encoding='utf-8'))
keep=[n for n in tree.body if isinstance(n,ast.FunctionDef)and n.name in ['money','price_field']or isinstance(n,ast.Assign)and any(isinstance(t,ast.Name)and t.id in ['PRICE_PAT','HEAD']for t in n.targets)]
ns={'re':re};exec(compile(ast.Module(body=keep,type_ignores=[]),'trusted_parser','exec'),ns)
s=json.loads((P/'summary.json').read_text(encoding='utf-8'));root=pathlib.Path(s['source'])
rows=[json.loads(l)for l in(P/'case-records.jsonl').read_text(encoding='utf-8').splitlines()]
cache={};changes=[];conflicts=[]
for r in rows:
 for src in r['sources']:
  key=(src['archive'],src['member'])
  if key not in cache:
   with zipfile.ZipFile(root/key[0])as z:
    text=z.read(key[1]).decode('utf-8-sig',errors='replace').replace('\r\n','\n')
   starts=list(ns['HEAD'].finditer(text));cache[key]={text[:m.start()].count('\n')+1:text[m.start():starts[i+1].start()if i+1<len(starts)else len(text)]for i,m in enumerate(starts)}
  block=cache[key][src['line']]
  for field in ['base','imei','processing','payout']:
   value=ns['price_field'](block,field)
   if value is None:continue
   if r[field]is None:
    r[field]=value;changes.append({'model':r['model'],'storage_gb':r['storage_gb'],'case_id':r['case_id'],'field':field,'value':value,'source':src})
   elif value!=r[field]:conflicts.append({'model':r['model'],'storage_gb':r['storage_gb'],'case_id':r['case_id'],'field':field,'left':r[field],'right':value,'source':src})
assert not conflicts,conflicts[:5]
for r in rows:
 if r['selling']is not None and all(r[k]is not None for k in ['base','imei']):assert r['base']-r['imei']==r['selling']
 if all(r[k]is not None for k in ['base','imei','processing','payout']):assert r['base']-r['imei']-r['processing']==r['payout']
(P/'case-records.jsonl').write_text(''.join(json.dumps(r,ensure_ascii=False)+'\n'for r in rows),encoding='utf-8')
if changes:(P/'amount-enrichments.json').write_text(json.dumps(changes,indent=2,ensure_ascii=False),encoding='utf-8')
print('Source-backed amount fields enriched:',len(changes),'conflicts:',len(conflicts))
