var BOX_BONUS = 380;
var FLOOR = 100;
var data = {
    "Nothing 1": { basePrice: 13900, case1Expected: 4040, case2Expected: 9200, case3Expected: 10630 },
    "Nothing 2": { basePrice: 20730, case1Expected: 5110, case2Expected: 11080, case3Expected: 12830 },
    "Nothing 2a": { basePrice: 17710, case1Expected: 4100, case2Expected: 8670, case3Expected: 10420 },
    "CMF": { basePrice: 11430, case1Expected: 2640, case2Expected: 4950, case3Expected: 6030 },
    "Nothing 2a Plus": { basePrice: 18260, case1Expected: 4220, case2Expected: 9110, case3Expected: 10870 },
    "Nothing 3a": { basePrice: 20810, case1Expected: 4580, case2Expected: 9760, case3Expected: 11810 },
    "Nothing 3": { basePrice: 32550, case1Expected: 10650, case2Expected: 17400, case3Expected: 20210 },
    "Nothing 3a Pro": { basePrice: 22710, case1Expected: 5000, case2Expected: 11200, case3Expected: 13250 },
    "Nothing 4a": { basePrice: 27000, case1Expected: 7850, case2Expected: 14450, case3Expected: 16500 },
    "Nothing 4a Pro": { basePrice: 32500, case1Expected: 12010, case2Expected: 18610, case3Expected: 20660 }
};
function calculate(basePrice, totalPenaltySum, boxBonus, ageMult) {
    var adjustedBase = basePrice * ageMult;
    var val = adjustedBase * (1 - totalPenaltySum);
    val += boxBonus ? BOX_BONUS : 0;
    var upliftPercent = 1;
    if (basePrice <= 20000)
        upliftPercent = 1.08;
    else if (basePrice <= 50000)
        upliftPercent = 1.06;
    else
        upliftPercent = 1.04;
    var fhoneifyExtra = val * (upliftPercent - 1);
    if (fhoneifyExtra > 2000)
        fhoneifyExtra = 2000;
    if (fhoneifyExtra < 100 && val > 1200)
        fhoneifyExtra = 100;
    return Math.max(Math.round(val + fhoneifyExtra), FLOOR);
}
for (var _i = 0, _a = Object.entries(data); _i < _a.length; _i++) {
    var _b = _a[_i], model = _b[0], cases = _b[1];
    console.log("\nOptimizing ".concat(model, "..."));
    var ageMult1 = 0.98; // Case 1 & 2
    var ageMult3 = 0.98 - 0.223828345567476; // Case 3 (GST Bill No)
    var bestTouch = 0.5, bestScreen = 0.5, bestScratch = 0.2;
    var minTDiff = Infinity, minSDiff = Infinity, minScrDiff = Infinity;
    for (var p = 0.01; p <= 0.99; p += 0.001) {
        // Case 1: Touch=NO (multiplier=p -> penalty=1-p), Scratch1-2=0.05, BackCamera=0.1827 or 0.135
        var bc = model === "Nothing 1" ? 0.13525179856115108 : 0.1827216262;
        var c1 = calculate(cases.basePrice, (1 - p) + bc, true, ageMult1);
        if (Math.abs(c1 - cases.case1Expected) < minTDiff) {
            minTDiff = Math.abs(c1 - cases.case1Expected);
            bestTouch = p;
        }
        // Case 2: OrigScreen=NO (multiplier=p -> penalty=1-p), FrontCamera=0.0658 or 0.0589
        var fc = model === "Nothing 1" ? 0.05899280575539568 : 0.06583850931677018;
        var c2 = calculate(cases.basePrice, (1 - p) + fc, true, ageMult1);
        if (Math.abs(c2 - cases.case2Expected) < minSDiff) {
            minSDiff = Math.abs(c2 - cases.case2Expected);
            bestScreen = p;
        }
        // Case 3: GST=NO, Scratch>2=p, Battery=0.062 or 0.0496
        var bat = model === "Nothing 1" ? 0.04964028776978417 : 0.06205533596837944;
        var c3 = calculate(cases.basePrice, p + bat, true, ageMult3);
        if (Math.abs(c3 - cases.case3Expected) < minScrDiff) {
            minScrDiff = Math.abs(c3 - cases.case3Expected);
            bestScratch = p;
        }
    }
    console.log("".concat(model, " => touchPenalty: ").concat(bestTouch.toFixed(4), ", originalScreenPenalty: ").concat(bestScreen.toFixed(4), ", scratchGt2: ").concat(bestScratch.toFixed(4)));
}
