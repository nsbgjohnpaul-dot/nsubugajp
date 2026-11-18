param([string]$Root = $PSScriptRoot)
$ErrorActionPreference = 'Stop'
$port = 9237
$profile = Join-Path ([IO.Path]::GetTempPath()) ('nsubuga-browser-check-' + [guid]::NewGuid().ToString('N'))
$browser = Start-Process -FilePath 'C:\Program Files\Google\Chrome\Application\chrome.exe' -ArgumentList @('--headless=new','--disable-gpu','--no-first-run','--autoplay-policy=no-user-gesture-required',"--remote-debugging-port=$port",('--user-data-dir="'+$profile+'"'),'about:blank') -WindowStyle Hidden -PassThru
$socket = $null
try {
  $tabs=$null
  for($attempt=0;$attempt -lt 30;$attempt++) { try { $tabs=Invoke-RestMethod "http://127.0.0.1:$port/json"; break } catch { Start-Sleep -Milliseconds 200 } }
  if(!$tabs) { throw 'Chrome debugging endpoint did not start.' }
  $tab = $tabs | Where-Object type -eq 'page' | Select-Object -First 1
  $socket = New-Object System.Net.WebSockets.ClientWebSocket
  $socket.ConnectAsync([uri]$tab.webSocketDebuggerUrl,[Threading.CancellationToken]::None).GetAwaiter().GetResult()
  $script:commandId=0
  function Cdp([string]$Method,$Params=@{}) {
    $script:commandId++
    $thisId=$script:commandId
    $payload=@{id=$thisId;method=$Method;params=$Params} | ConvertTo-Json -Depth 30 -Compress
    $bytes=[Text.Encoding]::UTF8.GetBytes($payload)
    $socket.SendAsync([ArraySegment[byte]]::new($bytes),[Net.WebSockets.WebSocketMessageType]::Text,$true,[Threading.CancellationToken]::None).GetAwaiter().GetResult()
    do {
      $stream=New-Object IO.MemoryStream
      do {
        $buffer=New-Object byte[] 32768
        $timeout=New-Object Threading.CancellationTokenSource
        $timeout.CancelAfter(20000)
        $received=$socket.ReceiveAsync([ArraySegment[byte]]::new($buffer),$timeout.Token).GetAwaiter().GetResult()
        $stream.Write($buffer,0,$received.Count)
        $timeout.Dispose()
      } while(!$received.EndOfMessage)
      $message=[Text.Encoding]::UTF8.GetString($stream.ToArray()) | ConvertFrom-Json
      $stream.Dispose()
    } while($message.id -ne $thisId)
    if($message.error) { throw ($message.error | ConvertTo-Json -Compress) }
    return $message.result
  }
  function Js([string]$Expression) {
    $reply=Cdp 'Runtime.evaluate' @{expression=$Expression;returnByValue=$true;awaitPromise=$true}
    if($reply.exceptionDetails) { throw ($reply.exceptionDetails | ConvertTo-Json -Depth 10 -Compress) }
    return $reply.result.value
  }
  function Visit([string]$Page) {
    $url=([uri](Join-Path $Root $Page)).AbsoluteUri
    $null=Cdp 'Page.navigate' @{url=$url}
    Start-Sleep -Milliseconds 400
    $null=Js '(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));return true})()'
  }
  function Assert($Condition,[string]$Message) { if(!$Condition) { throw "FAIL: $Message" }; Write-Output "PASS: $Message" }
  $null=Cdp 'Emulation.setDeviceMetricsOverride' @{width=1440;height=1000;deviceScaleFactor=1;mobile=$false}
  Visit 'work.html'
  Assert ((Js 'document.querySelectorAll(".work-gallery-card").length') -eq 15) 'All 15 artworks are in the gallery'
  Assert (Js '[...document.querySelectorAll(".work-gallery-card img")].every(i=>i.complete&&i.naturalWidth>0)') 'All 15 artwork files load'
  Assert ((Js 'document.querySelector("[data-work-gallery]").dataset.activeIndex') -eq '1') 'BODY&SOIL starts selected'
  $null=Cdp 'Input.dispatchMouseEvent' @{type='mouseWheel';x=720;y=450;deltaY=120;deltaX=0}
  Assert ((Js 'document.querySelector("[data-work-gallery]").dataset.activeIndex') -eq '2') 'Mouse wheel advances to the next artwork'
  $null=Js 'document.querySelector("[data-work-gallery]").focus()'
  $null=Cdp 'Input.dispatchKeyEvent' @{type='keyDown';key='ArrowRight';code='ArrowRight';windowsVirtualKeyCode=39}
  Assert ((Js 'document.querySelector("[data-work-gallery]").dataset.activeIndex') -eq '3') 'Arrow keys navigate artworks'
  $null=Cdp 'Input.dispatchKeyEvent' @{type='keyDown';key='Home';code='Home';windowsVirtualKeyCode=36}
  Assert (Js '!document.querySelector(".work-gallery-controls") && !document.querySelector("[data-work-count]") && !document.querySelector("[data-work-progress]") && !document.querySelector(".skip")') 'Work counter, timeline and skip link are removed'
  $titles=Js '(()=>{const a=[];for(let i=0;i<15;i++){a.push(document.querySelector("[data-work-gallery]").dataset.activeIndex);document.querySelector("[data-work-gallery]").dispatchEvent(new KeyboardEvent("keydown",{key:"ArrowRight",bubbles:true}))}return a})()'
  Assert (($titles | Select-Object -Unique).Count -eq 15) 'All 15 project slots are reachable'
  Assert ((Js 'document.querySelector("[data-work-gallery]").dataset.activeIndex') -eq '0') 'Gallery loops through all 15 artworks'
  $null=Js 'document.querySelector("[data-work-gallery]").dispatchEvent(new KeyboardEvent("keydown",{key:"ArrowRight",bubbles:true}))'
  Assert (Js '!document.querySelector("[data-work-case]") && !document.querySelector(".work-artwork-dialog")') 'Separate case-study button and preview modal are removed'
  Assert ((Js 'new Set([...document.querySelectorAll(".work-artwork img")].map(i=>i.getAttribute("src"))).size') -eq 3) 'Only the three Work project artworks are used'
  $destinations=Js '[...document.querySelectorAll(".work-artwork")].map(a=>a.getAttribute("href"))'
  Assert (($destinations | Select-Object -Unique).Count -eq 15) 'All 15 projects have their own case-study URL'
  foreach($destination in $destinations) {
    Assert (Test-Path -LiteralPath (Join-Path $Root $destination)) "Case study exists: $destination"
    Visit $destination
    Assert (Js '!!document.querySelector(".case h1") && document.querySelector(".case-hero").naturalWidth>0') "Case-study heading and artwork load: $destination"
  }
  Visit 'work.html'
  $null=Js 'document.querySelectorAll(".work-artwork")[1].click()'
  Start-Sleep -Milliseconds 400
  Assert (Js 'location.pathname.endsWith("body-and-soil.html")') 'Clicking an artwork navigates directly to its case study'
  Visit 'work.html'
  Assert (Js 'document.querySelector("[data-sound-toggle]").getAttribute("aria-pressed")==="true" && document.querySelector("[data-sound-toggle]").getAttribute("aria-label")==="Mute interface sounds"') 'Interface sounds are enabled by default'
  $null=Js 'document.querySelector("[data-sound-toggle]").click()'
  Assert (Js 'document.querySelector("[data-sound-toggle]").getAttribute("aria-pressed")==="false" && document.querySelector("[data-sound-toggle]").getAttribute("aria-label")==="Enable interface sounds"') 'Sound control mutes interface sounds'
  $null=Js 'document.querySelector("[data-sound-toggle]").click()'
  Assert (Js 'document.querySelector("[data-sound-toggle]").getAttribute("aria-pressed")==="true" && typeof audioPlayer==="undefined"') 'Sound control re-enables effects without a music player'
  $reference=$null
  foreach($page in @('index.html','work.html','about.html','idea-box.html','contact.html','body-and-soil.html')) {
    Visit $page
    Assert (Js 'document.querySelectorAll(".about-background-stage").length===1 && document.querySelectorAll(".about-character-field span").length===8000') "Shared background loads on $page"
    $positions=Js 'JSON.stringify([".audio-indicator",".site-header nav",".header-location",".header-inquiry"].map(s=>{const r=document.querySelector(s).getBoundingClientRect();return [Math.round(r.x*10)/10,Math.round(r.y*10)/10]}))'
    if(!$reference){$reference=$positions}
    Assert ($positions -eq $reference) "Header anchors match on $page"
    $null=Js 'window.scrollTo(0,400)'
    Assert ((Js 'JSON.stringify([".audio-indicator",".site-header nav",".header-location",".header-inquiry"].map(s=>{const r=document.querySelector(s).getBoundingClientRect();return [Math.round(r.x*10)/10,Math.round(r.y*10)/10]}))') -eq $reference) "Header stays fixed while scrolling $page"
  }
  Visit 'about.html'
  $null=Js '(()=>{const g=[...document.querySelectorAll(".about-character-field span")].find(e=>{const r=e.getBoundingClientRect();return r.x>300&&r.x<800&&r.y>200&&r.y<600});const r=g.getBoundingClientRect();document.dispatchEvent(new PointerEvent("pointermove",{clientX:r.x+r.width/2,clientY:r.y+r.height/2,bubbles:true}))})()'
  Start-Sleep -Milliseconds 300
  Assert (Js 'document.querySelectorAll(".about-character-field [data-reactive]").length>0') 'About characters react near the pointer'
  $null=Cdp 'Emulation.setEmulatedMedia' @{features=@(@{name='prefers-reduced-motion';value='reduce'})}
  Start-Sleep -Milliseconds 400
  Assert ((Js 'document.querySelectorAll(".about-character-field [data-reactive]").length') -eq 0) 'Reduced motion restores the original background characters'
  $null=Cdp 'Emulation.setEmulatedMedia' @{features=@()}
  $approachBottom=Js 'document.querySelector(".approach-link").getBoundingClientRect().bottom'
  Visit 'idea-box.html'
  $signatureBottom=Js 'document.querySelector(".frame-signature").getBoundingClientRect().bottom'
  Assert ([Math]::Abs($approachBottom-$signatureBottom) -lt 1) 'Approach and signature links share a footer baseline'
  $null=Cdp 'Emulation.setDeviceMetricsOverride' @{width=390;height=844;deviceScaleFactor=1;mobile=$true}
  $mobileAnchors=$null
  foreach($mobilePage in @('index.html','work.html','about.html','idea-box.html','contact.html','body-and-soil.html')) {
    Visit $mobilePage
    Assert (Js 'getComputedStyle(document.querySelector(".header-inquiry")).display==="none" && getComputedStyle(document.querySelector(".site-header nav")).display==="block"') "Mobile header uses the three-column Figma layout: $mobilePage"
    $anchors=Js 'JSON.stringify([".audio-indicator",".site-header nav",".header-location"].map(s=>{const r=document.querySelector(s).getBoundingClientRect();return [Math.round(r.left),Math.round(r.top)]}))'
    if(!$mobileAnchors){$mobileAnchors=$anchors}
    Assert ($anchors -eq $mobileAnchors) "Mobile header positions match: $mobilePage"
    Assert (Js 'document.querySelector(".header-location").getBoundingClientRect().right<=innerWidth && !!document.querySelector(".sound-icon")') "Mobile header fits and sound control loads: $mobilePage"
  }
  Visit 'index.html'
  $shot=Cdp 'Page.captureScreenshot' @{format='png';captureBeyondViewport=$false}
  [IO.File]::WriteAllBytes((Join-Path $Root 'mobile-header-preview.png'),[Convert]::FromBase64String($shot.data))
  $null=Cdp 'Emulation.setTouchEmulationEnabled' @{enabled=$true;maxTouchPoints=1}
  Visit 'work.html'
  $null=Cdp 'Input.dispatchTouchEvent' @{type='touchStart';touchPoints=@(@{x=190;y=400})}
  $null=Cdp 'Input.dispatchTouchEvent' @{type='touchMove';touchPoints=@(@{x=190;y=180})}
  $null=Cdp 'Input.dispatchTouchEvent' @{type='touchEnd';touchPoints=@()}
  Assert ((Js 'Number(document.querySelector("[data-work-gallery]").dataset.activeIndex)') -gt 1) 'Touch swiping advances the mobile gallery'
  Assert (Js 'document.documentElement.scrollWidth<=innerWidth') 'Mobile gallery fits without horizontal overflow'
  $null=Cdp 'Emulation.setEmulatedMedia' @{features=@(@{name='prefers-reduced-motion';value='reduce'})}
  Assert (Js '!!document.querySelector(".sound-icon")') 'Sound control remains available with reduced motion enabled'
  Visit 'contact.html'
  Assert (Js '!document.querySelector(".contact .particles") && !!document.querySelector(".contact .type-art")') 'Contact keeps the word cloud without its particle vector'
  $allPages=Get-ChildItem -LiteralPath $Root -Filter '*.html' -File
  foreach($localPage in $allPages) {
    $markup=[IO.File]::ReadAllText($localPage.FullName)
    Assert ($markup.Contains('src="about-background.js"') -and $markup.Contains('src="about-interaction.js"') -and $markup.Contains('href="about-motion.css"')) "Shared background assets included: $($localPage.Name)"
  }
  Write-Output 'All browser checks passed.'
} finally {
  if($socket) { $socket.Dispose() }
  if($browser -and !$browser.HasExited) { Stop-Process -Id $browser.Id -ErrorAction SilentlyContinue }
}