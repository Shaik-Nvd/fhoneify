"""Derive source-linked baseline deductions and controlled contrasts, without changing prices."""
import collections,itertools,json,pathlib,statistics
P=pathlib.Path(__file__).parent
records=[json.loads(l) for l in (P/'case-records.jsonl').read_text(encoding='utf-8').splitlines()]
priced=[r for r in records if r['status']=='priced']

def normalized(i):
    o=dict(i)
    a=str(o['age'] or '').lower()
    o['age']='below3' if 'below 3' in a else '3to6' if '3 months' in a and '6 months' in a else '6to11' if '6 months' in a and '11 months' in a else 'above11' if 'above 11' in a else None
    return o

groups=collections.defaultdict(list)
for r in priced:
    # Retain separate collection sessions; no combining changing baselines across reports.
    groups[(r['archive'],r['model'],r['storage_gb'],r['family'])].append(r)
deductions=[];contrasts=[];issues=[];coverage=[]
for key,rr in groups.items():
    baseline_id='0' if any(r['case_id']=='0'for r in rr) else '1'
    bases=[r for r in rr if r['case_id']==baseline_id]
    amounts={r['selling']for r in bases}
    if len(amounts)!=1:
        issues.append({'kind':'missing_or_conflicting_baseline','group':key,'values':sorted(amounts)})
        continue
    b=bases[0];bi=normalized(b['inputs']);bref=b['base']
    for r in rr:
        ri=normalized(r['inputs']);changed=[k for k in bi if ri[k]!=bi[k]]
        added=sorted(set(ri['codes'])-set(bi['codes']))
        removed=sorted(set(bi['codes'])-set(ri['codes']))
        incomplete=[k for k in ['calls','touch','originalScreen','box']if ri[k]is None or bi[k]is None]
        # Cases not offered in the actual form may yield a baseline control; don't call them a zero-priced fault.
        pure_functional=len(added)==1 and added[0].startswith('F') and not removed and changed==['codes'] and not incomplete
        deductions.append({'model':r['model'],'storage_gb':r['storage_gb'],'date':r['date'],'family':r['family'],'case_id':r['case_id'],
          'selling':r['selling'],'baseline_selling':b['selling'],'baseline_base':bref,'deduction':b['selling']-r['selling'],
          'payout_deduction':b['payout']-r['payout']if b['payout']is not None and r['payout']is not None else None,
          'added_codes':added,'removed_codes':removed,'changed_fields':changed,'pure_single_functional':pure_functional,
          'inputs':ri,'baseline_inputs':bi,'source':r['sources'][0],'baseline_source':b['sources'][0],
          'unknown_basic_fields':incomplete})
    # Paired combinations can identify an additional fault while all other faults remain fixed.
    for a,b2 in itertools.combinations(rr,2):
        ia,ib=normalized(a['inputs']),normalized(b2['inputs'])
        changed=[k for k in ia if ia[k]!=ib[k]]
        if changed==['codes']:
            plus=set(ia['codes'])-set(ib['codes']);minus=set(ib['codes'])-set(ia['codes'])
            if len(plus)+len(minus)!=1:continue
            more,less=(a,b2)if plus else(b2,a);code=next(iter(plus or minus))
            contrasts.append({'model':a['model'],'storage_gb':a['storage_gb'],'date':a['date'],'feature':code,
              'context_codes':sorted(set(less['inputs']['codes'])),'deduction':less['selling']-more['selling'],
              'source_more':more['sources'][0],'source_less':less['sources'][0]})
        elif changed==['box'] and ia['box']is not None and ib['box']is not None:
            less,more=(a,b2)if ia['box'] else(b2,a)
            contrasts.append({'model':a['model'],'storage_gb':a['storage_gb'],'date':a['date'],'feature':'missing_box',
              'context_codes':ia['codes'],'deduction':less['selling']-more['selling'],'source_more':more['sources'][0],'source_less':less['sources'][0]})

# Collapse equivalent contrast copies for statistics without discarding provenance in the exports.
single=[r for r in deductions if r['pure_single_functional']]
unique_single={}
for r in single:
    k=(r['model'],r['storage_gb'],r['date'],r['baseline_selling'],r['selling'],tuple(r['added_codes']))
    unique_single.setdefault(k,r)
single=list(unique_single.values())
patterns=[]
for model,code in sorted({(r['model'],r['added_codes'][0])for r in single}):
    rr=[r for r in single if r['model']==model and r['added_codes']==[code]]
    variants=sorted({r['storage_gb']for r in rr})
    errors={'fixed':[],'fraction_of_flawless_selling':[]}
    # Each held variant is excluded entirely; copies and repeated cases never cross the split.
    if len(variants)>=2:
        for gb in variants:
            train=[r for r in rr if r['storage_gb']!=gb];test=[r for r in rr if r['storage_gb']==gb]
            fixed=statistics.median(r['deduction']for r in train)
            ratio=statistics.median(r['deduction']/r['baseline_selling']for r in train)
            errors['fixed'] += [abs(fixed-r['deduction'])for r in test]
            errors['fraction_of_flawless_selling'] += [abs(ratio*r['baseline_selling']-r['deduction'])for r in test]
    scores={k:{'mae':round(statistics.mean(v),2),'worst':round(max(v),2),'held_rows':len(v)}for k,v in errors.items()if v}
    best=min(scores,key=lambda k:(scores[k]['mae'],0 if k=='fixed'else 1))if scores else None
    patterns.append({'model':model,'code':code,'variants':variants,'samples':len(rr),'observed_deductions':sorted({r['deduction']for r in rr}),
      'candidate_type':best,'fixed_rupees':statistics.median(r['deduction']for r in rr),
      'fraction_of_flawless_selling':statistics.median(r['deduction']/r['baseline_selling']for r in rr),'storage_holdout':scores,
      'source_examples':[r['source']for r in rr[:3]]})

iphone_models=sorted({r['model']for r in records if r['model'].startswith('iPhone')})
for model in iphone_models:
    rr=[r for r in records if r['model']==model]
    codes=sorted({r['added_codes'][0]for r in single if r['model']==model})
    known=[r for r in rr if r['status']=='priced']
    coverage.append({'model':model,'priced_records':len(known),'priced_storages':sorted({r['storage_gb']for r in known}),
      'pending_records':sum(r['status']=='pending'for r in rr),'unavailable_records':sum(r['status']=='unavailable'for r in rr),
      'pure_single_functional_codes':codes,'missing_pure_single_codes':[f'F{i:02}'for i in range(1,19)if f'F{i:02}'not in codes],
      'combination_records':sum(len(r['inputs']['codes'])>1 for r in known)})

summary={'priced_records':len(priced),'iphone_priced_records':sum(r['model'].startswith('iPhone')for r in priced),
 'samsung_priced_records':sum(not r['model'].startswith('iPhone')for r in priced),
 'priced_iphone_models':len({r['model']for r in priced if r['model'].startswith('iPhone')}),
 'priced_iphone_variants':len({(r['model'],r['storage_gb'])for r in priced if r['model'].startswith('iPhone')}),
 'baseline_deductions':len(deductions),'pure_single_functional_unique_rows':len(single),
 'paired_fault_or_box_contrasts':len(contrasts),'pattern_groups':len(patterns),
 'storage_holdout_pattern_groups':sum(bool(p['storage_holdout'])for p in patterns),
 'negative_deductions':sum(r['deduction']<0 for r in deductions),'issues':issues,
 'coverage':coverage}
for name,rows in [('baseline-deductions',deductions),('controlled-contrasts',contrasts),('single-functional-pairs',single)]:
    (P/(name+'.jsonl')).write_text(''.join(json.dumps(r,ensure_ascii=False)+'\n'for r in rows),encoding='utf-8')
(P/'functional-patterns.json').write_text(json.dumps(patterns,indent=2),encoding='utf-8')
(P/'analysis-summary.json').write_text(json.dumps(summary,indent=2),encoding='utf-8')
print(json.dumps({k:v for k,v in summary.items()if k!='coverage'},indent=2))
