"""Regression checks for import edge cases; execute only this audit's trusted definitions."""
import ast,pathlib
p=pathlib.Path(__file__).with_name('audit.py')
tree=ast.parse(p.read_text(encoding='utf-8'))
names={'SOURCE','OUT','HW','PHYSICAL','HEAD','PRICE_PAT'}
nodes=[n for n in tree.body if isinstance(n,(ast.Import,ast.ImportFrom,ast.FunctionDef))or isinstance(n,ast.Assign)and any(isinstance(t,ast.Name)and t.id in names for t in n.targets)]
ns={'__file__':str(p)}
exec(compile(ast.Module(body=nodes,type_ignores=[]),str(p),'exec'),ns)
parse=ns['inputs_from_text']
assert parse('Screen Physical Condition:\nScreen cracked/ glass broken: Not selected\nFunctional or Physical Problems:\nFront Camera not working: Not selected')['codes']==[]
assert parse('Functional or Physical Problems:\nFront Camera not working: Selected')['codes']==['F01']
assert parse('Body scratches / dents: No scratches; Major dent(s) or more than 2')['codes']==['C03']
assert parse('Functional problems: Finger Touch not working; Battery in Service (Health is less than 80%)')['codes']==['F04','F17']
assert parse('Screen physical defects: More than 2 scratches on screen')['codes']==['S03']
assert parse('Calls: Yes\nTouch screen working: No\nOriginal screen: Yes')['touch']is False
assert parse('Calls / touch / original screen / warranty / GST bill: Yes / No / Yes / Yes / Yes')['touch']is False
assert parse('EXAMPLE 05 - Finger Touch not working\nFunctional faults selected: None')['codes']==[]
assert parse('Case 2: Front Camera not working\nVerified selling price: INR 10000')['codes']==['F01']
assert ns['price_field']('Selling price: NOT AVAILABLE\nHistorical source selling price: INR 164980','selling')is None
assert ns['price_field']("Cashify's final selling price: ₹35,140",'selling')==35140
assert ns['price_field']('Processing Fee: -₹99','processing')==99
r=ns['parse_text']('Apple iPhone 16 (128 GB)\nEXAMPLE 24 - repeat of reference 23\nSelling price: INR 10000\nObserved at (UTC): 2026-10-26T20:00:00.000Z','test','test.txt','iPhone 16')[0]
assert r['case_id']=='24'
assert r['date']=='2026-10-27'and r['observed_at']=='2026-10-26T20:00:00.000Z'
assert ns['model_name']('Cashify_iPhone6SPlus_All_Variants.zip')=='iPhone 6S Plus'
assert ns['price_field']('Cashify’s Selling price : ₹4,820','selling')==4820
assert ns['price_field']('Price Summary — Total Amount : ₹4,751','payout')==4751
assert ns['parse_text']('APPLE IPHONE 12 PRO — INDIVIDUAL CONDITION CASES\nCASE 00) Flawless\nApple iPhone 12 Pro (128 GB)\nSelling price: INR 23000','test','test.txt','iPhone 12 Pro')[0]['family']=='individual_condition'
print('18 parser regression checks passed')
