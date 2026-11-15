$ErrorActionPreference = 'Stop'
$taskCachePath = Join-Path $PSScriptRoot '.cache'
New-Item -ItemType Directory -Force $taskCachePath | Out-Null
$taskGoogleUrl = 'https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&family=Inter:wght@400;500;600;700&family=Oxanium:wght@400;500;600&display=swap'
$taskPretendardUrl = 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css'
Invoke-WebRequest -Uri $taskGoogleUrl -OutFile (Join-Path $taskCachePath 'google.css') -TimeoutSec 30
Invoke-WebRequest -Uri $taskPretendardUrl -OutFile (Join-Path $taskCachePath 'pretendard.css') -TimeoutSec 30
$env:QA_CACHE = $taskCachePath
@'
const fs=require('fs'),p=require('path'),crypto=require('crypto');
const cache=process.env.QA_CACHE;
const sources=[['google.css','https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&family=Inter:wght@400;500;600;700&family=Oxanium:wght@400;500;600&display=swap'],['pretendard.css','https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css']];
const manifest={};
for(const [file,base]of sources)for(const hit of fs.readFileSync(p.join(cache,file),'utf8').matchAll(/url\(([^)]+)\)/g)){const url=new URL(hit[1].replace(/["']/g,''),base).href;manifest[url]=crypto.createHash('sha256').update(url).digest('hex')+'.font';}
fs.writeFileSync(p.join(cache,'manifest.json'),JSON.stringify(manifest,null,2));
'@ | node
$taskFontMap = Get-Content (Join-Path $taskCachePath 'manifest.json') -Raw | ConvertFrom-Json -AsHashtable
foreach ($taskPair in $taskFontMap.GetEnumerator()) {
  $taskFontPath = Join-Path $taskCachePath $taskPair.Value
  if (!(Test-Path -LiteralPath $taskFontPath)) {
    Invoke-WebRequest -Uri $taskPair.Key -OutFile $taskFontPath -TimeoutSec 30
  }
}
Invoke-WebRequest -Uri 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.170.0/three.module.min.js' -OutFile (Join-Path $taskCachePath 'three.module.min.js') -TimeoutSec 30
Write-Output "Set QA_CACHE=$taskCachePath before running check.cjs."
