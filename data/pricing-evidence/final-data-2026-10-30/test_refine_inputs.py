import importlib.util,pathlib
p=pathlib.Path(__file__).with_name('refine_inputs.py')
spec=importlib.util.spec_from_file_location('refine_inputs',p);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
assert m.compact_inputs('Touchscreen working: No\nScreen original: Yes\nOriginal Box with same IMEI: Available','')=={'touch':False,'originalScreen':True,'box':True}
assert m.compact_inputs('Original Box with same IMEI: Not selected (not available)','')['box']is False
assert m.compact_inputs('Original Charger of Device: Selected (available)','')['charger']is True
assert m.compact_inputs('Original Box with same IMEI: Not asked','')=={}
assert m.compact_inputs('age: "Below 3 months"\ndefects: ["Front Camera not working"]','')=={}
header='Default submitted answers where no override is listed: calls Yes, touchscreen Yes, original screen Yes, Indian warranty Yes, valid GST bill Yes.'
o=m.compact_inputs('answers: ["Yes", "No", "Yes", "Yes", "Yes"]\nbox: false\nage: "Not asked"\ndefects: ["Microphone not working"]',header)
assert o['touch']is False and o['calls']is True and o['box']is False and o['age']is None and o['codes']==['F13']
assert m.compact_inputs('Screen physical detail: Chipped/cracked outside display area\nDisplay details (spots / lines / discoloration): Not asked','')['physical_codes']==['S02']
assert m.compact_inputs('Actual age selection: Above 11 months','')['age']=='Above 11 months'
assert m.compact_inputs('Visible lines: Display faded along edges','')['physical_codes']==['D05']
print('9 compact-input regression checks passed')
