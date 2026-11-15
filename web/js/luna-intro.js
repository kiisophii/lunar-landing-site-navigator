/*!
 * Luna Sight — entry loading screen
 * The craft rides the loading bar; when loading is done it lifts off and lands on the moon,
 * while the Luna Sight logo rises where the bar was.
 * Self-contained, no dependencies. Exposes window.LunaIntro.
 *
 *   LunaIntro.mount();                                       // follows real page loading (window load)
 *   LunaIntro.mount({ waitFor: [texturesReady, dataReady] }); // also waits for your own promises
 *   var i = LunaIntro.mount({ progress: "manual" });         // or drive it yourself:
 *   i.setProgress(0.4); i.complete();
 *
 * Contest build (Team Ginkgo Orbit): Chaei Oh's original intro, with three changes only —
 *   1. (reverted 11/15, team decision) the wordmark is again the original traced logo vector (LOGO below);
 *   2. class names are prefixed "lsi-" so they cannot clash with the page (.ls-word, .ls-skip exist there);
 *   3. options `el` (render into an existing element, e.g. #ls-intro) and `label` (accessible name).
 */
(function (global) {
  "use strict";

  var DEFAULTS = {
    progress: "page",        // "page" = real page load (+ waitFor), "manual" = setProgress()/complete(), "auto" = fixed demo run
    waitFor: [],             // promises to wait for in "page" mode (each one moves the bar forward as it resolves)
    minMs: 900,              // the bar never completes before this (ms) — avoids a flash on very fast loads
    fastMs: 1600,            // if loading is done by this time, the landing plays faster (x0.7) and holds shorter
    autoMs: 1800,            // "auto" mode: how long the simulated load takes
    autoExit: true,          // fade out and remove itself when finished
    holdMs: 600,             // how long the landed moon + wordmark stays
    sessionOnce: false,      // true = play only once per browser session
    skippable: true,         // click / Esc / Enter / Space jumps to the end — only once loading is complete
    loadFonts: true,         // inject the Google Fonts <link> for the HUD mono
    wordmark: "LUNA SIGHT",  // accessible name; the visible wordmark is the Luna Sight logo
    label: "Loading Luna Sight", // accessible name of the progress bar
    font: "var(--font, system-ui, sans-serif)", // wordmark font = the top bar's
    el: null,                // existing element to render into (e.g. #ls-intro); default: a new one on <body>
    mono: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
    bg: "#000000",
    moon: "#EDEDED",
    accent: "#F5B83D",       // thrusters / touchdown (site's sunlight yellow)
    zIndex: 9999,
    onDone: null
  };

  // Luna Sight logo, traced from the brand file by Chaei Oh. One entry per letter; the G carries the star.
  var LOGO = {"w":1811,"h":159,"letters":[{"c":98.6,"d":"M3.5 3.5Q2.2 4.8 1.1 7.4Q0 10 0.1 60.8Q0.2 111.5 1.4 116.8Q2.5 122 4.2 126.8Q6 131.5 9.4 136.2Q12.8 141 16.5 144.4Q20.2 147.8 24.4 150.1Q28.5 152.5 33.5 154.4Q38.5 156.2 42.5 157.1Q46.5 158 52.9 158.5Q59.2 159 123.1 159Q187 159 189.2 158.2Q191.5 157.5 193.2 156Q195 154.5 196 151.9Q197 149.2 196.9 143.4Q196.8 137.5 195.8 135.6Q194.8 133.8 193.8 132.8Q192.8 131.8 190.1 130.5Q187.5 129.2 123.2 129.1Q59 129 56.1 128.6Q53.2 128.2 50.4 127.4Q47.5 126.5 44.1 124.5Q40.8 122.5 39.2 121.1Q37.8 119.8 35.9 117.2Q34 114.8 32.6 111.2Q31.2 107.8 31.2 59.5Q31.2 11.2 31 9.9Q30.8 8.5 29.9 6.8Q29 5 27.8 3.8Q26.5 2.5 24.2 1.5Q22 0.5 15.2 0.5Q8.5 0.5 6.6 1.4Q4.8 2.2 3.5 3.5Z"},{"c":308.8,"d":"M213.2 3.2Q212 4.5 211.1 6.1Q210.2 7.8 209.9 9.5Q209.5 11.2 209.5 53Q209.5 94.8 210 98.9Q210.5 103 212.2 110.1Q214 117.2 216.6 122.6Q219.2 128 221.8 131.5Q224.2 135 228 138.9Q231.8 142.8 233.6 144.2Q235.5 145.8 238.9 147.9Q242.2 150 247 152.1Q251.8 154.2 259.4 156.2Q267 158.2 269.5 158.5Q272 158.8 294.5 158.9Q317 159 331.6 158.8Q346.2 158.5 349.9 158Q353.5 157.5 357.9 156.4Q362.2 155.2 369.1 152.2Q376 149.2 381.1 145.6Q386.2 142 391.1 136.8Q396 131.5 398.1 127.9Q400.2 124.2 402.1 120Q404 115.8 405.1 111.6Q406.2 107.5 406.9 102.4Q407.5 97.2 407.6 53.5Q407.8 9.8 407 7.6Q406.2 5.5 404.8 3.9Q403.2 2.2 400.8 1.2Q398.2 0.2 391.8 0.4Q385.2 0.5 383.2 1.4Q381.2 2.2 379.9 3.6Q378.5 5 377.9 6.4Q377.2 7.8 377 9Q376.8 10.2 376.8 52.6Q376.8 95 376 99Q375.2 103 373.5 106.9Q371.8 110.8 370.5 112.6Q369.2 114.5 367 116.8Q364.8 119 359.9 122.1Q355 125.2 350 126.8Q345 128.2 339.1 128.6Q333.2 129 306 129Q278.8 129 276 128.8Q273.2 128.5 269.6 127.6Q266 126.8 263 125.4Q260 124 256.5 121.6Q253 119.2 251.2 117.6Q249.5 116 247.9 113.9Q246.2 111.8 244.9 109.2Q243.5 106.8 242.5 103.9Q241.5 101 241.1 98.6Q240.8 96.2 240.8 53.6Q240.8 11 240.4 9.4Q240 7.8 239.1 6.2Q238.2 4.8 237 3.5Q235.8 2.2 232.8 1.2Q229.8 0.2 223.8 0.4Q217.8 0.5 216.1 1.2Q214.5 2 213.2 3.2Z"},{"c":532.8,"d":"M441.9 13Q439.5 15.8 436.6 20.9Q433.8 26 432.6 31.2Q431.5 36.5 431.4 93.1Q431.2 149.8 431.9 151.9Q432.5 154 433.9 155.5Q435.2 157 437.5 157.9Q439.8 158.8 446.2 158.8Q452.8 158.8 455 157.8Q457.2 156.8 458.2 155.8Q459.2 154.8 460 153.2Q460.8 151.8 461 150.6Q461.2 149.5 461.2 94.6Q461.2 39.8 461.8 38.5Q462.2 37.2 463.5 35.8Q464.8 34.2 466.2 33.4Q467.8 32.5 469.2 32.2Q470.8 32 472.4 32.2Q474 32.5 475.6 33.4Q477.2 34.2 480.5 37.6Q483.8 41 486.4 44.8Q489 48.5 492 52Q495 55.5 500.1 62.5Q505.2 69.5 532.9 105.1Q560.5 140.8 565.4 145.8Q570.2 150.8 573.2 152.6Q576.2 154.5 581 156.2Q585.8 158 588.2 158.4Q590.8 158.8 596.5 158.5Q602.2 158.2 605.4 157.4Q608.5 156.5 611.8 154.9Q615 153.2 617.4 151.5Q619.8 149.8 622.9 146.4Q626 143 628.8 137.8Q631.5 132.5 632.2 129.9Q633 127.2 633.4 124.4Q633.8 121.5 633.9 67.4Q634 13.2 633.5 10Q633 6.8 631.4 4.6Q629.8 2.5 628.5 1.8Q627.2 1 625.8 0.6Q624.2 0.2 617.8 0.4Q611.2 0.5 609.4 1.4Q607.5 2.2 606.1 3.6Q604.8 5 604 6.5Q603.2 8 603 9.5Q602.8 11 602.8 65.4Q602.8 119.8 602.2 121.2Q601.8 122.8 600.4 124.2Q599 125.8 597 126.5Q595 127.2 592.4 126.9Q589.8 126.5 587.6 124.8Q585.5 123 576.5 111.6Q567.5 100.2 557.5 86.8Q547.5 73.2 528.8 49.4Q510 25.5 505 19.5Q500 13.5 497 10.8Q494 8 489.5 5.5Q485 3 482.5 2.1Q480 1.2 477.4 0.8Q474.8 0.2 470.5 0.2Q466.2 0.2 462.5 1Q458.8 1.8 454.6 3.6Q450.5 5.5 447.4 7.9Q444.2 10.2 441.9 13Z"},{"c":761.4,"d":"M647.4 146.9Q644.8 152.8 645.1 154.5Q645.5 156.2 646.2 157Q647 157.8 648.2 158.2Q649.5 158.8 657.4 158.6Q665.2 158.5 667.1 157.8Q669 157 670.6 155.5Q672.2 154 675.8 149Q679.2 144 689.2 128.2Q699.2 112.5 701.2 108.9Q703.2 105.2 724.5 72Q745.8 38.8 747.5 36.5Q749.2 34.2 751 32.8Q752.8 31.2 755 30.4Q757.2 29.5 759.8 29.4Q762.2 29.2 764.5 29.9Q766.8 30.5 768.5 31.5Q770.2 32.5 773.2 35.6Q776.2 38.8 805.6 85.4Q835 132 842.5 143.1Q850 154.2 852 155.9Q854 157.5 855.9 158.1Q857.8 158.8 864.9 158.8Q872 158.8 873.8 158.1Q875.5 157.5 876.4 156.5Q877.2 155.5 877.5 154.6Q877.8 153.8 877.4 151.5Q877 149.2 874 143.5Q871 137.8 867.4 132.1Q863.8 126.5 849.8 102.6Q835.8 78.8 818.2 50.4Q800.8 22 798 18.6Q795.2 15.2 792.6 12.6Q790 10 787.9 8.5Q785.8 7 781.9 5Q778 3 774.6 2Q771.2 1 768.1 0.5Q765 0 758.4 0.4Q751.8 0.8 749.9 1.1Q748 1.5 744.2 3Q740.5 4.5 736 7.2Q731.5 10 727.4 14.6Q723.2 19.2 721.1 22.1Q719 25 708.8 41.6Q698.5 58.2 696.4 62.2Q694.2 66.2 680.2 89.4Q666.2 112.5 658.1 126.8Q650 141 647.4 146.9ZM821.6 138.6Q820.2 136 816.4 131.2Q812.5 126.5 808.8 123Q805 119.5 800.1 116.1Q795.2 112.8 791.1 110.5Q787 108.2 782.8 106.8Q778.5 105.2 774 104.4Q769.5 103.5 765.2 103.2Q761 103 756.9 103.2Q752.8 103.5 749.2 104.1Q745.8 104.8 742 106Q738.2 107.2 734.4 109Q730.5 110.8 723.8 115.5Q717 120.2 714.1 123Q711.2 125.8 706.5 131.4Q701.8 137 699.9 140.4Q698 143.8 704.5 139.1Q711 134.5 717.8 131.1Q724.5 127.8 731.8 125.4Q739 123 746.9 121.9Q754.8 120.8 764 121Q773.2 121.2 781.1 122.9Q789 124.5 796.8 127.5Q804.5 130.5 809.4 133.1Q814.2 135.8 818 138.4Q821.8 141 822.4 141.1Q823 141.2 821.6 138.6Z"},{"c":1027.0,"d":"M1110.6 6.2Q1109.8 4.8 1107.2 2.9Q1104.8 1 1103.5 0.6Q1102.2 0.2 1099.8 0.1Q1097.2 0 1039.9 0.1Q982.5 0.2 976.8 1.2Q971 2.2 964.9 5Q958.8 7.8 956.6 9.2Q954.5 10.8 950.2 15.2Q946 19.8 943.5 24Q941 28.2 939.4 34Q937.8 39.8 937.5 44.5Q937.2 49.2 938 54.2Q938.8 59.2 940.4 63.8Q942 68.2 944.8 72.4Q947.5 76.5 951.6 80.5Q955.8 84.5 959.8 86.8Q963.8 89 967.8 90.6Q971.8 92.2 979.1 93.5Q986.5 94.8 1026.8 94.8Q1067 94.8 1070 95.1Q1073 95.5 1075.8 96.8Q1078.5 98 1081.1 100.8Q1083.8 103.5 1084.6 105.9Q1085.5 108.2 1085.5 111.4Q1085.5 114.5 1084.5 117.2Q1083.5 120 1081.5 122.4Q1079.5 124.8 1077.4 126Q1075.2 127.2 1071.8 128Q1068.2 128.8 1009.5 128.9Q950.8 129 949.4 129.2Q948 129.5 946.4 130.2Q944.8 131 943.2 132.4Q941.8 133.8 940.6 136.1Q939.5 138.5 939.5 143.8Q939.5 149 939.9 150.4Q940.2 151.8 941.1 153.2Q942 154.8 943.5 156Q945 157.2 947 158Q949 158.8 1010.6 158.8Q1072.2 158.8 1076.4 158.1Q1080.5 157.5 1083.8 156.5Q1087 155.5 1090.9 153.6Q1094.8 151.8 1097.5 149.8Q1100.2 147.8 1103.9 144Q1107.5 140.2 1110 136.2Q1112.5 132.2 1114.1 126.5Q1115.8 120.8 1116.1 114.5Q1116.5 108.2 1115.8 103.6Q1115 99 1113.4 94.5Q1111.8 90 1108.4 85.5Q1105 81 1101.4 77.8Q1097.8 74.5 1094.4 72.5Q1091 70.5 1086.8 68.9Q1082.5 67.2 1079.9 66.5Q1077.2 65.8 1074.1 65.4Q1071 65 1028.2 65Q985.5 65 983.9 64.8Q982.2 64.5 979 63Q975.8 61.5 973.2 58.9Q970.8 56.2 969.6 53.5Q968.5 50.8 968.5 47.2Q968.5 43.8 969.2 41.4Q970 39 972.1 36.5Q974.2 34 976.6 32.5Q979 31 982 30.4Q985 29.8 1043 29.8Q1101 29.8 1102.5 29.5Q1104 29.2 1105.4 28.6Q1106.8 28 1108.2 26.6Q1109.8 25.2 1110.9 22.9Q1112 20.5 1112.1 15.5Q1112.2 10.5 1111.9 9.1Q1111.5 7.8 1110.6 6.2Z"},{"c":1159.8,"d":"M1158.9 0.2Q1153 0.2 1150.9 1Q1148.8 1.8 1147.5 3Q1146.2 4.2 1145.1 7.1Q1144 10 1144 79.8Q1144 149.5 1145.1 152.1Q1146.2 154.8 1147.4 155.9Q1148.5 157 1149.5 157.5Q1150.5 158 1152 158.4Q1153.5 158.8 1159.6 158.8Q1165.8 158.8 1167.6 158.1Q1169.5 157.5 1171.1 156Q1172.8 154.5 1173.5 153.2Q1174.2 152 1174.6 150.5Q1175 149 1175 80.6Q1175 12.2 1174.8 10.2Q1174.5 8.2 1173.9 6.9Q1173.2 5.5 1171.4 3.6Q1169.5 1.8 1167.1 1Q1164.8 0.2 1158.9 0.2Z"},{"c":1307.0,"d":"M1216.6 33.5Q1212.2 40 1210.5 43.6Q1208.8 47.2 1206.8 52.8Q1204.8 58.2 1203.4 65.2Q1202 72.2 1202 79.5Q1202 86.8 1202.9 92.8Q1203.8 98.8 1204.6 102.1Q1205.5 105.5 1208.4 112.4Q1211.2 119.2 1215.6 125.9Q1220 132.5 1225.5 137.9Q1231 143.2 1234.8 145.8Q1238.5 148.2 1242.1 150.1Q1245.8 152 1252.2 154.2Q1258.8 156.5 1265.4 157.6Q1272 158.8 1312.1 158.8Q1352.2 158.8 1357.2 158.2Q1362.2 157.8 1365.6 156.9Q1369 156 1373 154.5Q1377 153 1381.1 150.8Q1385.2 148.5 1387.8 146.8Q1390.2 145 1395.6 139.4Q1401 133.8 1404 128.6Q1407 123.5 1408.4 120Q1409.8 116.5 1410.6 111.5Q1411.5 106.5 1411.8 98.4Q1412 90.2 1411.5 87.1Q1411 84 1409.4 80Q1407.8 76 1405.4 73.4Q1403 70.8 1400.5 69.2Q1398 67.8 1395.1 66.8Q1392.2 65.8 1390.1 65.5Q1388 65.2 1373 65.2Q1358 65.2 1355.6 66Q1353.2 66.8 1352 67.6Q1350.8 68.5 1349.2 70.2Q1347.8 72 1347.2 73.5Q1346.8 75 1346.9 80.2Q1347 85.5 1348.1 87.6Q1349.2 89.8 1350.4 90.9Q1351.5 92 1354.5 93.4Q1357.5 94.8 1367.8 94.9Q1378 95 1379.2 95.8Q1380.5 96.5 1380.9 97.5Q1381.2 98.5 1381.1 101.4Q1381 104.2 1380.4 106.8Q1379.8 109.2 1378.5 111.6Q1377.2 114 1375.6 116Q1374 118 1370.5 121Q1367 124 1364.1 125.4Q1361.2 126.8 1358.1 127.5Q1355 128.2 1351.2 128.5Q1347.5 128.8 1311.5 128.8Q1275.5 128.8 1269.6 127.5Q1263.8 126.2 1261.1 125Q1258.5 123.8 1254.4 121Q1250.2 118.2 1246.9 114.8Q1243.5 111.2 1239.9 105.2Q1236.2 99.2 1235 94.9Q1233.8 90.5 1233.1 86.2Q1232.5 82 1232.6 77.8Q1232.8 73.5 1234.1 68Q1235.5 62.5 1237.1 59.1Q1238.8 55.8 1241.1 52Q1243.5 48.2 1246.2 45.1Q1249 42 1251.5 40.1Q1254 38.2 1257.5 36.2Q1261 34.2 1264.6 32.9Q1268.2 31.5 1273 30.6Q1277.8 29.8 1332 29.8Q1386.2 29.8 1394.4 29.5Q1402.5 29.2 1404 28.6Q1405.5 28 1407 26.8Q1408.5 25.5 1409.2 24.5Q1410 23.5 1410.8 21.5Q1411.5 19.5 1411.5 15.4Q1411.5 11.2 1411 9.4Q1410.5 7.5 1408.5 5.1Q1406.5 2.8 1405.2 2Q1404 1.2 1402.4 0.8Q1400.8 0.2 1337.9 0.2Q1275 0.2 1268.4 1.1Q1261.8 2 1254.5 4.5Q1247.2 7 1244.5 8.4Q1241.8 9.8 1237.6 12.5Q1233.5 15.2 1227.2 21.1Q1221 27 1216.6 33.5Z","star":"M1300.8 54.8Q1300 53.5 1299.4 55Q1298.8 56.5 1298.1 60.5Q1297.5 64.5 1296.8 67.1Q1296 69.8 1295.4 71Q1294.8 72.2 1293.9 73.1Q1293 74 1290.8 75.1Q1288.5 76.2 1283.1 77.2Q1277.8 78.2 1275 79Q1272.2 79.8 1271.9 80.1Q1271.5 80.5 1273.5 81.1Q1275.5 81.8 1281.2 82.8Q1287 83.8 1289.8 84.9Q1292.5 86 1294.2 88.2Q1296 90.5 1297.6 97.6Q1299.2 104.8 1299.8 105.5Q1300.2 106.2 1300.8 105.2Q1301.2 104.2 1302.9 97.5Q1304.5 90.8 1305.2 89.2Q1306 87.8 1307 86.8Q1308 85.8 1310 84.8Q1312 83.8 1318.4 82.6Q1324.8 81.5 1325.9 80.9Q1327 80.2 1325.9 79.8Q1324.8 79.2 1318.5 77.9Q1312.2 76.5 1309.9 75.5Q1307.5 74.5 1306.2 72.8Q1305 71 1303.9 67.2Q1302.8 63.5 1302.1 59.8Q1301.5 56 1300.8 54.8Z"},{"c":1527.2,"d":"M1440.8 2.9Q1439.8 3.8 1438.6 5.9Q1437.5 8 1437.2 10.4Q1437 12.8 1437 80.9Q1437 149 1437.5 150.9Q1438 152.8 1439.1 154.4Q1440.2 156 1441.9 157Q1443.5 158 1444.9 158.4Q1446.2 158.8 1452.6 158.8Q1459 158.8 1461.1 157.9Q1463.2 157 1464.9 155.4Q1466.5 153.8 1467.2 151.2Q1468 148.8 1468.1 126.1Q1468.2 103.5 1468.9 101.9Q1469.5 100.2 1471.1 98.5Q1472.8 96.8 1474.4 96Q1476 95.2 1477.9 95Q1479.8 94.8 1527.4 94.8Q1575 94.8 1577.2 95.2Q1579.5 95.8 1581.6 97.4Q1583.8 99 1584.6 100.5Q1585.5 102 1586 103.9Q1586.5 105.8 1586.5 127.5Q1586.5 149.2 1587.2 151.6Q1588 154 1589.9 155.8Q1591.8 157.5 1594.6 158.1Q1597.5 158.8 1603.1 158.6Q1608.8 158.5 1610.4 157.9Q1612 157.2 1613.2 156.1Q1614.5 155 1615.4 153.5Q1616.2 152 1616.6 150.4Q1617 148.8 1617 79Q1617 9.2 1616.4 7.5Q1615.8 5.8 1614.1 3.9Q1612.5 2 1610.4 1.1Q1608.2 0.2 1602.2 0.2Q1596.2 0.2 1593.9 1Q1591.5 1.8 1589.8 3.4Q1588 5 1587.4 6.4Q1586.8 7.8 1586.5 9.4Q1586.2 11 1586.2 33.5Q1586.2 56 1585.6 57.6Q1585 59.2 1583.5 61Q1582 62.8 1580.9 63.5Q1579.8 64.2 1577.6 64.9Q1575.5 65.5 1527.9 65.5Q1480.2 65.5 1477.6 64.9Q1475 64.2 1472.5 62Q1470 59.8 1469 57.1Q1468 54.5 1468 32.6Q1468 10.8 1467.4 8.4Q1466.8 6 1464.5 3.8Q1462.2 1.5 1461.1 1Q1460 0.5 1458.1 0.2Q1456.2 0 1450.6 0.2Q1445 0.5 1443.4 1.2Q1441.8 2 1440.8 2.9Z"},{"c":1725.9,"d":"M1649.6 0.9Q1647.2 1.5 1645 3.6Q1642.8 5.8 1641.9 8.1Q1641 10.5 1641.2 16Q1641.5 21.5 1642.2 23.1Q1643 24.8 1644.9 26.6Q1646.8 28.5 1649.6 29.1Q1652.5 29.8 1675.9 29.8Q1699.2 29.8 1701.6 30.5Q1704 31.2 1706 33.4Q1708 35.5 1708.8 38Q1709.5 40.5 1709.4 90.9Q1709.2 141.2 1709.5 146.2Q1709.8 151.2 1710.6 153.1Q1711.5 155 1712.8 156.1Q1714 157.2 1715.5 157.9Q1717 158.5 1724.1 158.6Q1731.2 158.8 1733.1 158Q1735 157.2 1737 155.1Q1739 153 1739.6 149.6Q1740.2 146.2 1740.2 92.5Q1740.2 38.8 1740.6 37.4Q1741 36 1741.8 34.8Q1742.5 33.5 1743.6 32.5Q1744.8 31.5 1747.2 30.6Q1749.8 29.8 1775.1 29.8Q1800.5 29.8 1802 29.4Q1803.5 29 1804.9 28.2Q1806.2 27.5 1807.4 26.4Q1808.5 25.2 1809.4 23.1Q1810.2 21 1810.2 15.1Q1810.2 9.2 1809.5 7.4Q1808.8 5.5 1806.9 3.6Q1805 1.8 1802.9 1Q1800.8 0.2 1726.4 0.2Q1652 0.2 1649.6 0.9Z"}]};

  // timeline (ms). FIN values are relative to the moment the bar reaches 100%.
  var TIMING = {
    moonIn: [0, 600],
    barIn: [200, 700],       // track + craft appear
    bar: 600,                // bar may start filling
    finCollapse: [0, 450],   // bar folds into the center
    finText: 220,            // wordmark rises where the bar was
    finLift: [0, 700],       // lift off from the bar end, arc over the moon
    finDesc: [700, 1350],    // vertical powered descent
    finTouch: 1350,          // touchdown
    finEnd: 1850
  };

  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var prog = function (t, r) { return clamp((t - r[0]) / (r[1] - r[0]), 0, 1); };
  var easeOutCubic = function (x) { return 1 - Math.pow(1 - x, 3); };
  var easeInOutQuad = function (x) { return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; };
  var easeInCubic = function (x) { return x * x * x; };
  var easeOutQuad = function (x) { return 1 - (1 - x) * (1 - x); };
  var lerp = function (a, b, k) { return a + (b - a) * k; };
  var cubic = function (p0, p1, p2, p3, k) {
    var u = 1 - k;
    return u * u * u * p0 + 3 * u * u * k * p1 + 3 * u * k * k * p2 + k * k * k * p3;
  };

  // "auto" mode: quick start, two short stalls, steady finish
  function autoCurve(k) {
    var pts = [[0, 0], [0.25, 0.34], [0.4, 0.38], [0.65, 0.7], [0.78, 0.74], [1, 1]];
    for (var i = 1; i < pts.length; i++) {
      if (k <= pts[i][0]) {
        var a = pts[i - 1], b = pts[i];
        return lerp(a[1], b[1], easeInOutQuad((k - a[0]) / (b[0] - a[0])));
      }
    }
    return 1;
  }

  function injectStyles(o) {
    if (o.loadFonts && !document.getElementById("ls-intro-fonts")) {
      var l = document.createElement("link");
      l.id = "ls-intro-fonts";
      l.rel = "stylesheet";
      l.href = "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap";
      document.head.appendChild(l);
    }
    if (document.getElementById("ls-intro-style")) return;
    var css =
      ".ls-intro{position:fixed;inset:0;overflow:hidden;cursor:default;transition:opacity .5s ease}" +
      ".ls-intro.is-leaving{opacity:0}" +
      ".ls-intro canvas{position:absolute;inset:0;width:100%;height:100%;display:block;transition:transform .6s cubic-bezier(.2,.7,.2,1)}" +
      ".ls-intro.is-leaving canvas{transform:scale(1.05)}" +
      ".lsi-word{position:absolute;pointer-events:none}" +
      ".lsi-word svg{display:block;width:100%;height:auto;overflow:visible}" +
      ".lsi-word g{opacity:0;transform:translate(var(--dx),40px);transition:opacity .45s ease,transform 1s cubic-bezier(.2,.7,.2,1)}" +
      ".lsi-word.is-in g{opacity:1;transform:none}" +
      ".lsi-star{transform-box:fill-box;transform-origin:center;transform:scale(0) rotate(-90deg);transition:transform .7s cubic-bezier(.3,1.7,.4,1)}" +
      ".lsi-word.is-star .lsi-star{transform:none}" +
      ".lsi-pct{position:absolute;font-size:11px;letter-spacing:.12em;font-variant-numeric:tabular-nums;pointer-events:none;transition:opacity .3s ease}" +
      ".lsi-hud{position:absolute;font-size:11px;letter-spacing:.12em;text-transform:uppercase;opacity:0;transition:opacity .4s ease;pointer-events:none;font-variant-numeric:tabular-nums}" +
      ".lsi-hud.is-on{opacity:1}" +
      ".lsi-hud b{font-weight:500}" +
      ".lsi-skip{position:absolute;top:24px;right:24px;display:flex;align-items:center;gap:8px;height:32px;padding:0 12px;background:transparent;border:1px solid rgba(255,255,255,.18);border-radius:2px;font-size:11px;letter-spacing:.12em;text-transform:uppercase;cursor:pointer;opacity:.75;transition:opacity .2s,border-color .2s}" +
      ".lsi-skip:hover,.lsi-skip:focus-visible{opacity:1;border-color:rgba(255,255,255,.5);outline:none}" +
      ".lsi-skip[disabled]{opacity:.3;cursor:default}";
    var s = document.createElement("style");
    s.id = "ls-intro-style";
    s.textContent = css;
    document.head.appendChild(s);
  }

  function mount(options) {
    var o = {};
    for (var k in DEFAULTS) o[k] = DEFAULTS[k];
    for (var k2 in (options || {})) o[k2] = options[k2];
    var mode = o.progress;
    var T = Object.assign({}, TIMING);

    var done = false;
    function finish() {
      if (done) return;
      done = true;
      if (typeof o.onDone === "function") o.onDone();
      try { document.dispatchEvent(new CustomEvent("lunaintro:done")); } catch (e) {}
    }
    var noop = function () {};

    if (o.sessionOnce) {
      try {
        if (sessionStorage.getItem("ls-intro-played")) { finish(); return { setProgress: noop, complete: noop, skip: noop, destroy: noop }; }
        sessionStorage.setItem("ls-intro-played", "1");
      } catch (e) {}
    }

    injectStyles(o);
    var reduced = global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // ---------- DOM ----------
    var root = o.el || document.createElement("div");
    root.innerHTML = "";
    root.hidden = false;
    root.className = "ls-intro";
    root.setAttribute("role", "progressbar");
    root.setAttribute("aria-label", o.label);
    root.setAttribute("aria-valuemin", "0");
    root.setAttribute("aria-valuemax", "100");
    root.setAttribute("aria-valuenow", "0");
    root.style.background = o.bg;
    root.style.zIndex = o.zIndex;
    root.style.color = o.moon;

    var canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    root.appendChild(canvas);

    var word = document.createElement("div");
    word.className = "lsi-word";
    word.setAttribute("aria-hidden", "true");
    var svgNS = "http://www.w3.org/2000/svg";
    var logoSvg = document.createElementNS(svgNS, "svg");
    logoSvg.setAttribute("viewBox", "0 0 " + LOGO.w + " " + LOGO.h);
    logoSvg.setAttribute("fill", o.moon);
    LOGO.letters.forEach(function (L, i) {
      var g = document.createElementNS(svgNS, "g");
      g.style.setProperty("--dx", ((L.c - LOGO.w / 2) * 0.22).toFixed(1) + "px");   // starts spread out, closes in
      g.style.transitionDelay = (i * 40) + "ms";
      var p = document.createElementNS(svgNS, "path");
      p.setAttribute("fill-rule", "evenodd");
      p.setAttribute("d", L.d);
      g.appendChild(p);
      if (L.star) {
        var sp = document.createElementNS(svgNS, "path");
        sp.setAttribute("class", "lsi-star");
        sp.setAttribute("d", L.star);
        g.appendChild(sp);
      }
      logoSvg.appendChild(g);
    });
    word.appendChild(logoSvg);
    root.appendChild(word);

    var pct = document.createElement("div");
    pct.className = "lsi-pct";
    pct.style.fontFamily = o.mono;
    pct.style.color = "rgba(237,237,237,.55)";
    pct.style.opacity = "0";
    pct.setAttribute("aria-hidden", "true");
    root.appendChild(pct);

    function hud(pos) {
      var d = document.createElement("div");
      d.className = "lsi-hud";
      d.style.fontFamily = o.mono;
      d.setAttribute("aria-hidden", "true");
      for (var p in pos) d.style[p] = pos[p];
      root.appendChild(d);
      return d;
    }
    var hudClock = hud({ left: "24px", bottom: "24px", color: "rgba(237,237,237,.55)" });
    var hudStat = hud({ right: "24px", bottom: "24px", color: "rgba(237,237,237,.55)", textAlign: "right" });

    var skipBtn = null;
    if (o.skippable) {
      skipBtn = document.createElement("button");
      skipBtn.type = "button";
      skipBtn.className = "lsi-skip";
      skipBtn.disabled = true;
      skipBtn.style.fontFamily = o.mono;
      skipBtn.style.color = o.moon;
      skipBtn.innerHTML = 'Skip<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true"><path d="M4 6L10.5 12L4 18Z" fill="currentColor"></path><path d="M12.5 6L19 12L12.5 18Z" fill="currentColor"></path></svg>';
      root.appendChild(skipBtn);
    }

    if (!root.parentNode) document.body.appendChild(root);
    var prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";

    // ---------- canvas sizing ----------
    var ctx = canvas.getContext("2d");
    var W = 0, H = 0, dpr = 1;
    function resize() {
      dpr = Math.min(global.devicePixelRatio || 1, 2);
      W = root.clientWidth; H = root.clientHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    global.addEventListener("resize", resize);

    var stars = [];
    var seed = 7;
    var rnd = function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    for (var i = 0; i < 90; i++) stars.push({ x: rnd(), y: rnd(), a: 0.12 + rnd() * 0.35, s: rnd() < 0.15 ? 1.5 : 1, tw: rnd() * 6.28 });

    // ---------- progress sources ----------
    var target = 0;              // where the bar should be (0..1)
    var shown = 0;               // what the bar shows
    var completed = false;       // loading is truly finished
    var finAt = null;            // time the bar reached 100%
    var finScale = 1;            // < 1 when loading was fast: the landing plays quicker
    var start = null, lastT = 0, clock = 0, lastNow = 0;

    function bump(v) { target = Math.max(target, clamp(v, 0, 1)); }

    var pageLoaded = false, waitTotal = 0, waitDone = 0;
    if (mode === "page") {
      var waits = (o.waitFor || []).filter(function (p) { return p && typeof p.then === "function"; });
      waitTotal = waits.length;
      var checkDone = function () { if (pageLoaded && waitDone >= waitTotal) completed = true; };
      waits.forEach(function (p) {
        var settle = function () { waitDone++; checkDone(); };
        p.then(settle, settle);              // a failed request never blocks the intro
      });
      var onLoad = function () { pageLoaded = true; checkDone(); };
      if (document.readyState === "complete") onLoad();
      else global.addEventListener("load", onLoad, { once: true });
    }

    // the share of the bar that real signals have earned so far ("page" mode)
    function pageProgress(t) {
      var parts = 1 + waitTotal;
      var earned = ((pageLoaded ? 1 : 0) + waitDone) / parts;
      var rs = document.readyState === "loading" ? 0 : 0.1;
      // creep forward while waiting, but never beyond what is still pending
      var creep = (1 - Math.exp(-(t - T.bar) / 2600)) * 0.85;
      return Math.min(0.97, Math.max(rs, earned * 0.97, Math.min(creep, earned + (1 - earned) * 0.85)));
    }

    function geom() {
      var R = clamp(Math.min(W, H) * 0.13, 52, 132);
      var cx = W / 2, cy = H * 0.42;
      var barW = clamp(R * 3.2, 200, 420);
      return { R: R, cx: cx, cy: cy, barW: barW, barX: cx - barW / 2, barY: cy + R + R * 0.78 };
    }


    var trail = [], lastCraft = null, heading = 0, dust = [], dustSpawned = false;

    // ---------- frame ----------
    function draw(t, dt) {
      var g = geom(), R = g.R, cx = g.cx, cy = g.cy;
      var craftS = Math.max(6, R * 0.085);
      var legH = craftS * 0.7;
      ctx.clearRect(0, 0, W, H);

      // progress
      if (t >= T.bar && finAt === null) {
        if (mode === "auto") {
          bump(autoCurve(clamp((t - T.bar) / o.autoMs, 0, 1)));
          if (t - T.bar >= o.autoMs) completed = true;
        } else if (mode === "page") {
          bump(pageProgress(t));
        }
        var goal = (completed && t >= o.minMs) ? 1 : Math.min(target, 0.97);
        // ease toward the goal; never faster than ~9% per 100ms (15% at the very end) so it never jumps
        var step = (goal - shown) * Math.min(1, dt / 160);
        if (goal === 1) step = Math.max(step, 0.0012 * dt);  // no slow crawl at the end once loaded
        shown += clamp(step, 0, Math.min(goal - shown, (completed ? 0.0022 : 0.0009) * dt));
        if (goal === 1 && 1 - shown < 0.003) shown = 1;
        if (shown >= 1) { finAt = t; finScale = t <= o.fastMs ? 0.7 : 1; }
      }
      if (skipBtn && completed && skipBtn.disabled) skipBtn.disabled = false;
      var f = finAt === null ? -1 : (t - finAt) / finScale;
      var tf = finAt === null ? -1 : f - T.finTouch;

      // stars
      var starA = easeOutCubic(prog(t, [0, 800]));
      for (var i = 0; i < stars.length; i++) {
        var st = stars[i];
        var a = st.a * starA * (0.75 + 0.25 * Math.sin(t / 700 + st.tw));
        ctx.fillStyle = "rgba(237,237,237," + a.toFixed(3) + ")";
        ctx.fillRect(Math.round(st.x * W), Math.round(st.y * H), st.s, st.s);
      }

      // moon (+ touchdown wobble)
      var mIn = easeOutCubic(prog(t, T.moonIn));
      var mR = R * lerp(0.86, 1, mIn);
      var kw = tf >= 0 ? clamp(tf / 500, 0, 1) : 0;
      var mcy = cy + (tf >= 0 ? R * 0.035 * Math.sin(kw * Math.PI * 2.5) * (1 - kw) : 0);
      ctx.globalAlpha = mIn;
      ctx.fillStyle = o.moon;
      ctx.beginPath(); ctx.arc(cx, mcy, mR, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;

      // bar track + fill
      var appear = easeOutCubic(prog(t, T.barIn));
      var collapse = f >= 0 ? easeInCubic(prog(f, T.finCollapse)) : 0;
      if (appear > 0 && collapse < 1) {
        var half = g.barW / 2 * (1 - collapse) * lerp(0.6, 1, appear);
        ctx.fillStyle = "rgba(237,237,237," + (0.16 * appear * (1 - collapse)).toFixed(3) + ")";
        ctx.fillRect(cx - half, g.barY - 0.5, half * 2, 1);
        if (f < 0) {
          ctx.fillStyle = o.moon;
          ctx.fillRect(g.barX, g.barY - 1, g.barW * shown, 2);
        } else {
          ctx.fillStyle = f < 180 ? o.accent : o.moon;
          ctx.fillRect(cx - half, g.barY - 1, half * 2, 2);
        }
      }

      // craft
      var x = null, y = null, thrust = false, descending = false, landed = false, craftA = 1;
      var hoverY = cy - R * 1.7;
      var landedY = mcy - R - craftS / 2 - legH;
      if (f < 0) {
        if (t >= T.barIn[0]) {
          x = g.barX + g.barW * shown;
          y = g.barY;
          craftA = appear;
          thrust = target > shown + 0.003;
        }
      } else if (f < T.finLift[1]) {
        var l = easeInOutQuad(prog(f, T.finLift));
        var bx = g.barX + g.barW, by = g.barY;
        x = cubic(bx, bx + R * 1.0, cx + R * 1.6, cx, l);
        y = cubic(by, by - R * 0.7, hoverY - R * 0.4, hoverY, l);
        thrust = true;
      } else if (f < T.finDesc[1]) {
        x = cx;
        y = lerp(hoverY, landedY, easeOutQuad(prog(f, T.finDesc)));
        descending = true;
      } else {
        x = cx; y = landedY; landed = true;
      }

      if (x !== null) {
        trail.push({ x: x, y: y, t: t });
        if (lastCraft) {
          var dx = x - lastCraft.x, dy = y - lastCraft.y;
          if (dx * dx + dy * dy > 0.25) heading = Math.atan2(dy, dx);
        }
        lastCraft = { x: x, y: y };
      }
      var keep = 220;
      while (trail.length && t - trail[0].t > keep) trail.shift();
      if (trail.length > 1) {
        ctx.lineCap = "butt";
        for (var j = 1; j < trail.length; j++) {
          var age = (t - trail[j].t) / keep;
          var al = Math.pow(1 - age, 1.6) * craftA;
          ctx.strokeStyle = "rgba(237,237,237," + al.toFixed(3) + ")";
          ctx.lineWidth = craftS * lerp(0.9, 0.25, age);
          ctx.beginPath();
          ctx.moveTo(trail[j - 1].x, trail[j - 1].y);
          ctx.lineTo(trail[j].x, trail[j].y);
          ctx.stroke();
        }
      }

      if (x !== null) {
        var rot = 0;
        if (f >= 0 && f < T.finLift[1]) rot = heading;
        else if (descending) rot = lerp(heading, 0, easeOutCubic(prog(f, [T.finDesc[0], T.finDesc[0] + 260])));
        ctx.fillStyle = o.accent;
        if (thrust) {                                     // flame behind the craft
          var fl = craftS * (0.8 + Math.random() * 1.2);
          ctx.save();
          ctx.globalAlpha = craftA;
          ctx.translate(x, y); ctx.rotate(rot);
          ctx.fillRect(-craftS / 2 - 1 - fl, -craftS * 0.18, fl, craftS * 0.36);
          ctx.restore();
        }
        if (descending) {                                 // retro-thrust pointing down
          var fd = craftS * (1.1 + Math.random() * 1.5) * (1 - prog(f, T.finDesc) * 0.6);
          ctx.fillRect(x - craftS * 0.18, y + craftS / 2 + 1, craftS * 0.36, fd);
        }
        ctx.save();
        ctx.globalAlpha = craftA;
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.fillStyle = o.moon;
        ctx.fillRect(-craftS / 2, -craftS / 2, craftS, craftS);
        ctx.restore();

        var legs = f >= 0 ? prog(f, [T.finDesc[1] - 220, T.finDesc[1]]) : 0;
        if (legs > 0) {
          ctx.strokeStyle = o.moon;
          ctx.lineWidth = Math.max(1, craftS * 0.18);
          ctx.lineCap = "square";
          var lby = y + craftS / 2, spread = craftS * lerp(0.4, 0.95, legs), drop = legH * legs;
          ctx.beginPath();
          ctx.moveTo(x - craftS * 0.35, lby); ctx.lineTo(x - spread, lby + drop);
          ctx.moveTo(x + craftS * 0.35, lby); ctx.lineTo(x + spread, lby + drop);
          ctx.stroke();
        }
      }

      // touchdown: dust ring + particles
      if (tf >= 0) {
        var kr = clamp(tf / 700, 0, 1), er = easeOutCubic(kr);
        ctx.strokeStyle = "rgba(245,184,61," + (0.9 * (1 - kr)).toFixed(3) + ")";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(cx, mcy - R, R * 1.15 * er, R * 0.17 * er, 0, 0, Math.PI * 2);
        ctx.stroke();
        if (!dustSpawned) {
          dustSpawned = true;
          for (var nd = 0; nd < 16; nd++) {
            var dir = nd % 2 ? 1 : -1;
            dust.push({ x: cx, y: mcy - R, vx: dir * (0.03 + Math.random() * 0.08) * R / 60, vy: -(0.015 + Math.random() * 0.05) * R / 60, s: 1 + Math.random() * 2, born: t });
          }
        }
      }
      for (var qd = dust.length - 1; qd >= 0; qd--) {
        var pt = dust[qd], life = (t - pt.born) / 700;
        if (life >= 1) { dust.splice(qd, 1); continue; }
        var ddt = t - pt.born;
        ctx.fillStyle = "rgba(237,237,237," + (1 - life).toFixed(3) + ")";
        ctx.fillRect(pt.x + pt.vx * ddt, pt.y + pt.vy * ddt + 0.00006 * R * ddt * ddt / 60, pt.s, pt.s);
      }

      // DOM: wordmark where the bar was, percentage under the bar's right end
      var lw = clamp(R * 4.1, 250, 540), lh = lw * LOGO.h / LOGO.w;
      word.style.width = lw + "px";
      word.style.left = (cx - lw / 2) + "px";
      word.style.top = (g.barY - lh / 2) + "px";
      if (tf >= 0 && !starShown) { starShown = true; word.classList.add("is-star"); }
      pct.style.left = (g.barX + g.barW - 40) + "px";
      pct.style.width = "40px";
      pct.style.textAlign = "right";
      pct.style.top = (g.barY + 12) + "px";
      pct.style.opacity = (appear > 0.5 && f < 0) ? "1" : "0";
      var n = Math.round(shown * 100);
      pct.textContent = ("00" + n).slice(-3) + "%";
      root.setAttribute("aria-valuenow", String(n));

      // HUD
      hudClock.innerHTML = "T+ <b>" + ("0" + Math.floor(t / 60000)).slice(-2) + ":" + ("0" + (t / 1000 % 60).toFixed(2)).slice(-5) + "</b>";
      if (tf >= 0) hudStat.innerHTML = '<b style="color:' + o.accent + '">Touchdown</b>';
      else if (f >= T.finDesc[0]) hudStat.innerHTML = "ALT <b>" + Math.round(lerp(500, 0, easeOutQuad(prog(f, T.finDesc)))) + " m</b>";
      else if (f >= 0) hudStat.innerHTML = "Descent <b>initiated</b>";
      else hudStat.innerHTML = "Loading <b>" + ("00" + n).slice(-3) + "%</b>";
    }

    // ---------- loop ----------
    var raf = 0, leaving = false, textShown = false, hudShown = false, starShown = false;

    function showText() {
      if (textShown) return;
      textShown = true;
      word.offsetWidth;
      word.classList.add("is-in");
    }

    function leave() {
      if (leaving) return;
      leaving = true;
      if (!o.autoExit) { finish(); return; }
      root.classList.add("is-leaving");
      setTimeout(destroy, 520);
    }

    function frame(now) {
      // The timeline runs on its own clock: each drawn frame advances it by at most 100 ms. While the app is
      // starting up the main thread stalls for long stretches; on the wall clock those stalls skipped the bar,
      // the craft and the wordmark (only the Moon disc was ever drawn). Now a stall pauses the intro instead.
      if (start === null) { start = now; lastNow = now; }
      clock += Math.min(100, Math.max(0, now - lastNow)); lastNow = now;
      var t = clock;
      var dt = Math.min(64, Math.max(0, t - lastT));
      lastT = t;
      if (!hudShown && t > 120) { hudShown = true; hudClock.classList.add("is-on"); hudStat.classList.add("is-on"); }
      draw(t, dt);
      if (finAt !== null) {
        var fe = (t - finAt) / finScale;
        if (fe >= T.finText) showText();
        if (!leaving && fe >= T.finEnd + o.holdMs * finScale) leave();
      }
      if (!done || !o.autoExit) raf = requestAnimationFrame(frame);
    }

    // jump to the landed end state (only once loading is complete)
    function skip() {
      if (leaving || !completed || start === null) return;
      var t = lastT;
      shown = 1; target = 1;
      if (finAt === null || (t - finAt) / finScale < T.finEnd) finAt = t - T.finEnd * finScale;
      trail.length = 0;
      showText();
    }

    function onKey(e) {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") { e.preventDefault(); skip(); }
    }
    if (o.skippable) {
      root.addEventListener("click", skip);
      document.addEventListener("keydown", onKey);
    }

    function destroy() {
      cancelAnimationFrame(raf);
      global.removeEventListener("resize", resize);
      document.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = prevOverflow;
      if (o.el) { root.hidden = true; root.innerHTML = ""; root.className = "ls-intro"; root.removeAttribute("role"); root.removeAttribute("style"); }
      else if (root.parentNode) root.parentNode.removeChild(root);
      finish();
    }

    if (reduced) {                         // reduced motion: no flight, land in place once loaded
      T = Object.assign({}, T, { finLift: [0, 1], finDesc: [1, 2], finTouch: 2, finEnd: 300 });
    }

    raf = requestAnimationFrame(frame);
    return {
      setProgress: function (v) { bump(+v || 0); },
      complete: function () { completed = true; target = 1; },
      skip: skip,
      destroy: destroy
    };
  }

  global.LunaIntro = { mount: mount };
})(window);
