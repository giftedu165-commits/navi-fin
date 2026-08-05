(function(){
  'use strict';
  const STORAGE_KEY='blue-trace-observations-v1';
  const ROUTE_ECO=[
    [34.8800,129.3100],
    [34.9500,129.2350],
    [35.0180,129.1700],
    [35.0380,129.1540],
    [35.0780,129.1630],
    [35.0960,129.1420],
    [35.0940,129.1180],
    [35.0890,129.1050],
    [35.0900,129.0920],
    [35.0950,129.0800],
    [35.1020,129.0700],
    [35.1030,129.0640],
    [35.1120,129.0680]
  ];
  const ROUTE_COASTAL=[
    [34.8800,129.3000],
    [34.9500,129.2250],
    [35.0200,129.1600],
    [35.0350,129.1470],
    [35.0750,129.1580],
    [35.0920,129.1380],
    [35.0940,129.1180],
    [35.0890,129.1050],
    [35.0900,129.0920],
    [35.0950,129.0800],
    [35.1020,129.0700],
    [35.1030,129.0640],
    [35.1120,129.0680]
  ];
  let route=ROUTE_ECO.map(point=>point.slice());
  const zones=[
    {name:'오륙도 해양보호구역',center:[35.090833,129.127222],radius:335,kind:'법정 해양보호구역',source:'https://busan.mof.go.kr/ko/page.do?menuIdx=4537'},
    {name:'생도 연안 관찰권역',center:[35.0333,129.1360],radius:1300,kind:'항로 인접 생물 관찰권역',source:'https://download.nifs.go.kr/portal/ofiris/ME/jemo/20160819_0920.pdf'}
  ];
  const speciesInfo={
    '나팔고둥':['🐚','해양보호생물 관찰'], '잘피류':['🌿','연안 식생 관찰'], '감태·대황':['🌱','해조군락 관찰'], '왕우럭조개':['🐚','패류 관찰'],
    '어류':['🐟','어류 관찰'], '저서생물':['🪸','저서생물 관찰'], '산호·해면류':['🪸','고착생물 관찰'], '해파리류':['🪼','해파리 관찰'], '기타 패류':['🐚','패류 관찰'], '기타':['●','기타 생물 관찰']
  };

  const map=L.map('map',{zoomControl:false,minZoom:8}).setView([35.045,129.075],11);
  L.control.zoom({position:'topright'}).addTo(map);
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{attribution:'Tiles © Esri'}).addTo(map);
  L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',{attribution:'Labels © Esri',pane:'overlayPane'}).addTo(map);

  const zoneLayer=L.layerGroup().addTo(map),reportLayer=L.layerGroup().addTo(map),marineLayer=L.layerGroup().addTo(map);
  const zoneShapes=[];
  zones.forEach(z=>{
    const outer=L.circle(z.center,{radius:z.radius+520,color:'#ff4f43',weight:3,dashArray:'10 8',fillColor:'#ff4f43',fillOpacity:.055,interactive:false,className:'risk-zone-ring'}).addTo(zoneLayer);
    const core=L.circle(z.center,{radius:z.radius,color:'#ff5d4c',weight:3,fillColor:'#ef6a52',fillOpacity:.25}).bindPopup(`<div class="popup-head">핵심 위험 · ${z.name}</div><span class="popup-badge">${z.kind}</span><div class="popup-note">선박 항로 또는 소음 영향권과 겹칠 수 있어 주의가 필요한 웹 지도용 단순화 범위입니다.<br><a href="${z.source}" target="_blank" rel="noopener">근거 자료 보기</a></div>`).addTo(zoneLayer);
    zoneShapes.push({outer,core});
    L.marker(z.center,{interactive:false,icon:L.divIcon({className:'',html:`<div class="zone-tag danger">핵심 위험 · ${z.name}</div>`,iconSize:[150,24],iconAnchor:[75,-12]})}).addTo(zoneLayer);
  });
  document.querySelectorAll('[data-focus-zone]').forEach(button=>button.addEventListener('click',()=>{const zone=zones[Number(button.dataset.focusZone)];if(zone)map.setView(zone.center,14);}));
  let routeBounds=L.latLngBounds(route);
  const routeLine=L.polyline(route,{color:'#f4c453',weight:5,dashArray:'12 9',opacity:.96}).bindPopup('<div class="popup-head">Korea Strait → 부산 북항 시연 경로</div><div class="popup-note">API 해양모델에 따라 검증된 두 개의 시연 경로 중 하나를 선택합니다. 실제 운항은 최신 해도와 VTS 지시를 따라야 합니다.</div>').addTo(map);
  const routeEndpointIcon=(label,type)=>L.divIcon({className:'',html:`<div class="route-endpoint ${type}">${label}</div>`,iconSize:[116,24],iconAnchor:type==='start'?[12,12]:[104,12]});
  const routeStartMarker=L.marker(route[0],{icon:routeEndpointIcon('Korea Strait 출발','start'),zIndexOffset:240}).bindPopup('<div class="popup-head">Korea Strait 출발</div>').addTo(map);
  const routeFinishMarker=L.marker(route[route.length-1],{icon:routeEndpointIcon('북항 내부 수역 도착','finish'),zIndexOffset:240}).bindPopup('<div class="popup-head">북항 내부 수역 도착</div><div class="popup-note">영도 북동쪽 끝을 지난 뒤 북항 수로로 진입합니다.</div>').addTo(map);
  routeStartMarker.on('click',()=>map.setView(route[0],14));
  routeFinishMarker.on('click',()=>map.setView(route[route.length-1],15));
  document.getElementById('routeOverviewButton').addEventListener('click',()=>map.fitBounds(routeBounds,{padding:[38,38],maxZoom:11}));

  const noiseFar=L.circle(route[0],{radius:2500,color:'#08a89b',weight:1,fillColor:'#08a89b',fillOpacity:.07,interactive:false}).addTo(map);
  const noiseMid=L.circle(route[0],{radius:1350,color:'#f2b84b',weight:1,fillColor:'#f2b84b',fillOpacity:.10,interactive:false}).addTo(map);
  const noiseNear=L.circle(route[0],{radius:600,color:'#ef6a52',weight:1,fillColor:'#ef6a52',fillOpacity:.16,interactive:false}).addTo(map);
  const shipIcon=L.divIcon({className:'ship-marker',html:'🚢',iconSize:[30,30],iconAnchor:[15,15]});
  const ship=L.marker(route[0],{icon:shipIcon,zIndexOffset:500}).bindTooltip('수중소음 시연 선박',{direction:'top'}).addTo(map);
  const routeMode=document.getElementById('routeMode');
  function applyRecommendedRoute(nextRoute,mode,focus=false){route=nextRoute.map(point=>point.slice());routeBounds=L.latLngBounds(route);routeLine.setLatLngs(route);routeStartMarker.setLatLng(route[0]);routeFinishMarker.setLatLng(route[route.length-1]);shipProgress=0;ship.setLatLng(route[0]);noiseNear.setLatLng(route[0]);noiseMid.setLatLng(route[0]);noiseFar.setLatLng(route[0]);routeMode.textContent=mode;if(focus)map.fitBounds(routeBounds,{padding:[38,38],maxZoom:11});}
  const riskAlert=document.getElementById('riskAlert'),riskAlertText=document.getElementById('riskAlertText'),certificateStatus=document.getElementById('certificateStatus'),certificateProgress=document.getElementById('certificateProgress'),certificateButton=document.getElementById('certificateButton'),certificateReset=document.getElementById('certificateReset');
  const certificateDialog=document.getElementById('certificateDialog'),CERT_REQUIRED=5,CERT_DISPLAY_MINUTES=5;
  let shipProgress=0,lastFrame=0,lastRiskCheck=0,lowSpeedSeconds=0,certificateReady=false,qualifiedZone='',qualifiedSpeed=0,lastCertificateCode='';
  function createCertificateCode(now){let digits='';do{const random=new Uint32Array(1);crypto.getRandomValues(random);digits=String(random[0]%1000000).padStart(6,'0');}while(`NF-DEMO-${now.getFullYear()}-${digits}`===lastCertificateCode);lastCertificateCode=`NF-DEMO-${now.getFullYear()}-${digits}`;return lastCertificateCode;}
  function interpolate(points,t){const scaled=t*(points.length-1),i=Math.min(points.length-2,Math.floor(scaled)),p=scaled-i;return [points[i][0]+(points[i+1][0]-points[i][0])*p,points[i][1]+(points[i+1][1]-points[i][1])*p];}
  function riskTargets(pos,influenceRadius){const targets=[];zones.forEach((z,index)=>{if(map.distance(pos,z.center)<=z.radius+influenceRadius)targets.push({name:z.name,index,type:'zone'});});observations.forEach(r=>{const radius=(Number(r.activityRadiusKm)||1)*1000;if(map.distance(pos,[r.lat,r.lng])<=radius+influenceRadius)targets.push({name:`${r.species} 신고 활동권`,type:'report'});});return targets;}
  function assessRisk(pos,timestamp,speed){if(timestamp-lastRiskCheck<180)return;const elapsed=lastRiskCheck?(timestamp-lastRiskCheck)/1000:0;lastRiskCheck=timestamp;const affected=riskTargets(pos,noiseFar.getRadius());riskAlert.hidden=!affected.length;if(affected.length){riskAlertText.textContent=`${affected.map(item=>item.name).join(' · ')}이 선박의 상대 소음권 안에 있습니다.`;riskAlert.classList.toggle('is-severe',speed>8);}zoneShapes.forEach((shape,index)=>{const active=affected.some(item=>item.type==='zone'&&item.index===index);[shape.outer,shape.core].forEach(layer=>{const element=layer.getElement();if(element)element.classList.toggle('is-active-risk',active);});});if(certificateReady)return;if(affected.length&&speed<=8){lowSpeedSeconds=Math.min(CERT_REQUIRED,lowSpeedSeconds+elapsed);qualifiedZone=affected[0].name;qualifiedSpeed=speed;certificateStatus.textContent=`감속 확인 중 ${Math.round(lowSpeedSeconds/CERT_REQUIRED*100)}% · 기준 ${CERT_DISPLAY_MINUTES}분`;}else{lowSpeedSeconds=0;certificateStatus.textContent=affected.length?'생태 영향권 · 8kn 이하로 감속하세요':`위험구역에서 8kn 이하 ${CERT_DISPLAY_MINUTES}분 감속`;}certificateProgress.style.width=`${lowSpeedSeconds/CERT_REQUIRED*100}%`;if(lowSpeedSeconds>=CERT_REQUIRED){certificateReady=true;certificateButton.disabled=false;certificateButton.classList.add('ready');certificateStatus.textContent=`${CERT_DISPLAY_MINUTES}분 감속 조건 확인 완료`;showToast('시연용 저소음 운항 확인서를 발급할 수 있습니다.');}}
  function animateShip(timestamp){if(timestamp-lastFrame>35){const speed=Number(document.getElementById('speedRange').value);shipProgress=(shipProgress+.00045*speed/11)%1;const pos=interpolate(route,shipProgress);ship.setLatLng(pos);noiseNear.setLatLng(pos);noiseMid.setLatLng(pos);noiseFar.setLatLng(pos);assessRisk(pos,timestamp,speed);lastFrame=timestamp;}requestAnimationFrame(animateShip);}
  requestAnimationFrame(animateShip);
  certificateButton.addEventListener('click',()=>{if(!certificateReady)return;const now=new Date(),certificateCode=createCertificateCode(now);document.getElementById('certificateZone').textContent=qualifiedZone;document.getElementById('certificateSpeed').textContent=`${qualifiedSpeed} kn 이하 · 기준 ${CERT_DISPLAY_MINUTES}분 유지 (웹 시연 ${CERT_REQUIRED}초)`;document.getElementById('certificateDate').textContent=new Intl.DateTimeFormat('ko-KR',{dateStyle:'long',timeStyle:'short'}).format(now);document.getElementById('certificateNumber').textContent=certificateCode;document.getElementById('certificateClaimNumber').value=certificateCode;certificateDialog.showModal();});
  certificateReset.addEventListener('click',()=>{certificateReady=false;lowSpeedSeconds=0;qualifiedZone='';qualifiedSpeed=0;certificateButton.disabled=true;certificateButton.classList.remove('ready');certificateProgress.style.width='0%';certificateStatus.textContent=`위험구역에서 8kn 이하 ${CERT_DISPLAY_MINUTES}분 감속`;document.getElementById('certificateNumber').textContent='-';document.getElementById('certificateClaimNumber').value='';if(certificateDialog.open)certificateDialog.close();showToast('감속 확인 진행을 초기화했습니다. 새 확인번호는 다음 발급 시 생성됩니다.');});
  document.getElementById('closeCertificate').addEventListener('click',()=>certificateDialog.close());
  document.getElementById('printCertificate').addEventListener('click',()=>window.print());
  certificateDialog.addEventListener('click',event=>{if(event.target===certificateDialog)certificateDialog.close();});

  const speedRange=document.getElementById('speedRange'),speedValue=document.getElementById('speedValue'),noiseLevel=document.getElementById('noiseLevel');
  function updateNoise(){const speed=Number(speedRange.value),extra=(speed-6)*55;speedValue.textContent=`${speed} kn`;noiseNear.setRadius(480+extra*.34);noiseMid.setRadius(1050+extra*.75);noiseFar.setRadius(2050+extra*1.25);const level=speed<=9?'낮음':speed<=13?'보통':'높음';noiseLevel.textContent=`상대 소음 영향: ${level}`;}
  speedRange.addEventListener('input',updateNoise);updateNoise();

  const SEA_API='https://marine-api.open-meteo.com/v1/marine?latitude=35.08&longitude=129.16&current=wave_height,wave_direction,wave_period,sea_surface_temperature,ocean_current_velocity,ocean_current_direction&timezone=Asia%2FSeoul';
  const marinePoints=[{name:'남외항 외해',lat:35.03,lng:129.18},{name:'오륙도 외해',lat:35.08,lng:129.16},{name:'해운대 외해',lat:35.13,lng:129.18},{name:'기장 외해',lat:35.22,lng:129.25},{name:'생도 남방',lat:34.98,lng:129.22}];
  const routeWeatherPoints=[{name:'대한해협 남방',lat:34.88,lng:129.30},{name:'생도 남방',lat:35.02,lng:129.16},{name:'오륙도 동측',lat:35.09,lng:129.14},{name:'북항 입구',lat:35.10,lng:129.09}];
  const SEA_GRID_API=`https://marine-api.open-meteo.com/v1/marine?latitude=${marinePoints.map(p=>p.lat).join(',')}&longitude=${marinePoints.map(p=>p.lng).join(',')}&current=wave_height,wave_direction,wave_period,sea_surface_temperature&timezone=Asia%2FSeoul`;
  const ROUTE_API=`https://marine-api.open-meteo.com/v1/marine?latitude=${routeWeatherPoints.map(p=>p.lat).join(',')}&longitude=${routeWeatherPoints.map(p=>p.lng).join(',')}&current=wave_height,wave_direction&timezone=Asia%2FSeoul`;
  const seaNow=document.querySelector('.sea-now'),seaUpdated=document.getElementById('seaUpdated'),refreshSea=document.getElementById('refreshSea');
  function compassName(degrees){if(!Number.isFinite(degrees))return '--';const names=['북','북동','동','남동','남','남서','서','북서'];return names[Math.round(degrees/45)%8];}
  function showMarineValue(id,value,digits=1){document.getElementById(id).textContent=Number.isFinite(value)?Number(value).toFixed(digits):'--';}
  async function loadSeaConditions(){seaNow.classList.remove('is-error');seaNow.classList.add('is-loading');refreshSea.disabled=true;seaUpdated.textContent='해양예보 불러오는 중…';try{const response=await fetch(SEA_API,{cache:'no-store'});if(!response.ok)throw new Error('marine-api');const data=await response.json(),current=data.current||{};showMarineValue('waveHeight',current.wave_height,2);showMarineValue('wavePeriod',current.wave_period,1);showMarineValue('seaTemperature',current.sea_surface_temperature,1);showMarineValue('currentVelocity',current.ocean_current_velocity,1);const waveDirection=Number(current.wave_direction),currentDirection=Number(current.ocean_current_direction);document.getElementById('waveDirection').textContent=Number.isFinite(waveDirection)?`${compassName(waveDirection)} ${Math.round(waveDirection)}°`:'--';document.getElementById('currentDirection').textContent=Number.isFinite(currentDirection)?`${compassName(currentDirection)} ${Math.round(currentDirection)}°`:'--';document.getElementById('waveArrow').style.transform=`rotate(${Number.isFinite(waveDirection)?waveDirection:0}deg)`;document.getElementById('currentArrow').style.transform=`rotate(${Number.isFinite(currentDirection)?currentDirection:0}deg)`;seaUpdated.textContent=`${String(current.time||'').replace('T',' ')} 모델 기준`;seaNow.classList.remove('is-loading');}catch{seaNow.classList.remove('is-loading');seaNow.classList.add('is-error');seaUpdated.textContent='해양예보를 불러오지 못했습니다.';}finally{refreshSea.disabled=false;}}
  function waveColor(height){return height<.5?'#38c8ae':height<1?'#f2bd54':height<2?'#ef765f':'#d93e55';}
  async function loadMarineMap(){try{const response=await fetch(SEA_GRID_API,{cache:'no-store'});if(!response.ok)throw new Error('marine-grid');const raw=await response.json(),items=Array.isArray(raw)?raw:[raw];marineLayer.clearLayers();items.forEach((item,index)=>{const point=marinePoints[index],current=item.current||{},height=Number(current.wave_height),direction=Number(current.wave_direction),period=Number(current.wave_period),temperature=Number(current.sea_surface_temperature),color=waveColor(Number.isFinite(height)?height:0);const icon=L.divIcon({className:'',html:`<div class="marine-reading" style="--wave-color:${color};--wave-rotate:${Number.isFinite(direction)?direction:0}deg"><b>↑</b><strong>${Number.isFinite(height)?height.toFixed(1):'--'}</strong></div>`,iconSize:[25,25],iconAnchor:[12,12]});L.marker([point.lat,point.lng],{icon,zIndexOffset:80}).bindPopup(`<div class="popup-head">${point.name} 해양예보</div><span class="popup-badge">API 모델 지점</span><div class="popup-note">파고 ${Number.isFinite(height)?height.toFixed(2)+' m':'--'}<br>파향 ${Number.isFinite(direction)?compassName(direction)+' '+Math.round(direction)+'°':'--'}<br>파주기 ${Number.isFinite(period)?period.toFixed(1)+'초':'--'} · 수온 ${Number.isFinite(temperature)?temperature.toFixed(1)+'°C':'--'}<br><small>관측소 실측·항해용 정보 아님</small></div>`).addTo(marineLayer);});}catch{marineLayer.clearLayers();}}
  async function loadRouteCondition(focusRoute=false){const output=document.getElementById('routeCondition');try{const response=await fetch(ROUTE_API,{cache:'no-store'});if(!response.ok)throw new Error('route-marine');const raw=await response.json(),items=Array.isArray(raw)?raw:[raw],heights=items.map(item=>Number(item.current&&item.current.wave_height)).filter(Number.isFinite),maxWave=Math.max(...heights);if(!Number.isFinite(maxWave))throw new Error('route-wave');const isCalm=maxWave<1.2,mode=isCalm?'API 추천 · 생태 우회형':'API 추천 · 연안 주의형';applyRecommendedRoute(isCalm?ROUTE_ECO:ROUTE_COASTAL,mode,focusRoute);output.textContent=`4개 경로 지점 최대 파고 ${maxWave.toFixed(1)} m · ${isCalm?'관찰권역에서 더 떨어진 경로':'짧은 접근 경로와 감속 권장'}`;output.dataset.level=maxWave>=2?'high':maxWave>=1.2?'caution':'normal';if(focusRoute)showToast('최신 해양모델로 시연 경로를 새로 선택했습니다.');}catch{routeMode.textContent='기본 시연 경로';output.textContent='API 연결 실패 · 기본 경로 유지';output.dataset.level='error';}}
  function refreshSeaData(focusRoute=false){loadSeaConditions();loadMarineMap();loadRouteCondition(focusRoute);}
  refreshSea.addEventListener('click',()=>refreshSeaData(true));refreshSeaData(false);setInterval(()=>refreshSeaData(false),10*60*1000);

  const latInput=document.getElementById('latitude'),lngInput=document.getElementById('longitude'),positionHelp=document.getElementById('positionHelp'),pinButton=document.getElementById('pinButton'),gpsButton=document.getElementById('gpsButton');
  let draftMarker=null,pickMode=false;
  const draftIcon=L.divIcon({className:'',html:'<div class="draft-pin"></div>',iconSize:[28,35],iconAnchor:[14,32]});
  function setDraftLocation(lat,lng,focus=true){
    const point=L.latLng(lat,lng);latInput.value=point.lat.toFixed(6);lngInput.value=point.lng.toFixed(6);
    if(!draftMarker){draftMarker=L.marker(point,{icon:draftIcon,draggable:true,zIndexOffset:800}).addTo(map);draftMarker.on('dragend',e=>{const p=e.target.getLatLng();setDraftLocation(p.lat,p.lng,false);});}else draftMarker.setLatLng(point);
    if(focus)map.setView(point,14);positionHelp.textContent='핀을 끌어서 관찰 위치를 더 정확하게 조정할 수 있습니다.';
  }
  pinButton.addEventListener('click',()=>{pickMode=!pickMode;pinButton.classList.toggle('active',pickMode);positionHelp.textContent=pickMode?'지도에서 관찰 지점을 한 번 클릭하세요.':'지도 선택을 취소했습니다.';});
  map.on('click',e=>{if(!pickMode)return;setDraftLocation(e.latlng.lat,e.latlng.lng,false);pickMode=false;pinButton.classList.remove('active');});
  gpsButton.addEventListener('click',()=>{
    if(!navigator.geolocation){showToast('이 브라우저는 GPS 위치 기능을 지원하지 않습니다.');return;}
    gpsButton.disabled=true;gpsButton.textContent='위치 확인 중…';positionHelp.textContent='기기의 위치 권한을 확인하고 있습니다.';
    navigator.geolocation.getCurrentPosition(pos=>{setDraftLocation(pos.coords.latitude,pos.coords.longitude,true);gpsButton.disabled=false;gpsButton.textContent='◎ 현재 GPS 사용';showToast('현재 위치를 관찰 핀으로 설정했습니다.');},err=>{gpsButton.disabled=false;gpsButton.textContent='◎ 현재 GPS 사용';positionHelp.textContent='GPS를 사용할 수 없습니다. 지도에서 위치를 선택해 주세요.';showToast(err.code===1?'위치 권한이 허용되지 않았습니다.':'현재 위치를 확인하지 못했습니다.');},{enableHighAccuracy:true,timeout:10000,maximumAge:30000});
  });

  const speciesSelect=document.getElementById('speciesSelect'),speciesPreview=document.getElementById('speciesPreview'),activityRange=document.getElementById('activityRange'),activityRangeValue=document.getElementById('activityRangeValue');
  const activityDefaults={'나팔고둥':.3,'잘피류':.2,'감태·대황':.2,'왕우럭조개':.2,'어류':3,'저서생물':.3,'산호·해면류':.2,'해파리류':5,'기타 패류':.3,'기타':1};
  function updateActivityRange(){activityRangeValue.textContent=`${Number(activityRange.value).toFixed(1)} km`;}
  activityRange.addEventListener('input',updateActivityRange);updateActivityRange();
  speciesSelect.addEventListener('change',()=>{const info=speciesInfo[speciesSelect.value];speciesPreview.textContent=info?`${info[0]} ${info[1]} · 신고 지점에 사용자 관찰 표식으로 표시됩니다.`:'종을 선택하면 지도 표시에 사용할 분류가 나타납니다.';if(activityDefaults[speciesSelect.value]){activityRange.value=activityDefaults[speciesSelect.value];updateActivityRange();}});

  const photoInput=document.getElementById('observationPhoto'),photoPreview=document.getElementById('photoPreview'),photoPreviewImage=document.getElementById('photoPreviewImage'),photoStatus=document.getElementById('photoStatus');
  let pendingPhoto='',photoProcessing=false,photoTask=0;
  function clearPendingPhoto(){photoTask++;photoProcessing=false;pendingPhoto='';photoInput.value='';photoPreviewImage.removeAttribute('src');photoPreview.hidden=true;photoStatus.textContent='';}
  function resizePhoto(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(new Error('read'));reader.onload=()=>{const image=new Image();image.onerror=()=>reject(new Error('image'));image.onload=()=>{const maxSide=1280,scale=Math.min(1,maxSide/Math.max(image.naturalWidth,image.naturalHeight)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));const context=canvas.getContext('2d');context.drawImage(image,0,0,canvas.width,canvas.height);resolve(canvas.toDataURL('image/jpeg',.78));};image.src=reader.result;};reader.readAsDataURL(file);});}
  photoInput.addEventListener('change',async()=>{const file=photoInput.files&&photoInput.files[0];if(!file)return;if(!/^image\/(jpeg|png|webp)$/.test(file.type)){showToast('JPG, PNG 또는 WEBP 사진을 선택해 주세요.');clearPendingPhoto();return;}if(file.size>12*1024*1024){showToast('12MB 이하 사진을 선택해 주세요.');clearPendingPhoto();return;}const task=++photoTask;pendingPhoto='';photoProcessing=true;photoPreviewImage.removeAttribute('src');photoStatus.textContent='사진을 줄이는 중…';photoPreview.hidden=false;try{const resized=await resizePhoto(file);if(task!==photoTask)return;pendingPhoto=resized;photoPreviewImage.src=pendingPhoto;photoStatus.textContent=`${Math.round(file.size/1024).toLocaleString()}KB 원본 · 기기 저장용으로 축소 완료`;showToast('현장 사진을 첨부했습니다.');}catch{if(task!==photoTask)return;showToast('사진을 읽지 못했습니다. 다른 파일을 선택해 주세요.');clearPendingPhoto();}finally{if(task===photoTask)photoProcessing=false;}});
  document.getElementById('removePhoto').addEventListener('click',()=>{clearPendingPhoto();showToast('첨부 사진을 삭제했습니다.');});

  const cloud=window.NaviFinCloud;
  const cloudMode=Boolean(cloud&&cloud.available);
  let cloudReady=false;
  let certificateClaims=[];
  let observations=loadReports();
  function loadReports(){try{const parsed=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');return Array.isArray(parsed)?parsed:[];}catch{return [];}}
  function saveReports(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(observations));return true;}catch{showToast('사진 저장 공간이 부족합니다. 이전 사진 기록을 지우거나 사진 없이 등록해 주세요.');return false;}}
  function escapeHtml(value){return String(value).replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));}
  function photoButton(r,className='popup-photo'){return r.photo?`<button type="button" class="${className}" data-photo-id="${r.id}" aria-label="${escapeHtml(r.species)} 관찰 사진 크게 보기"><img src="${escapeHtml(r.photo)}" alt="${escapeHtml(r.species)} 현장 관찰 사진"></button>`:'';}
  function reportPopup(r){const info=speciesInfo[r.species]||['●','관찰 신고'],radius=Number(r.activityRadiusKm)||1;return `${photoButton(r)}<div class="popup-head">${info[0]} ${escapeHtml(r.species)}</div><span class="popup-badge">사용자 현장 관찰</span><div class="popup-note">${r.note?escapeHtml(r.note)+'<br>':''}추정 활동 반경 약 ${radius.toFixed(1)} km<br>${escapeHtml(formatDate(r.createdAt))}<br><small>사용자 설정 참고 범위 · 실제 서식지 아님</small></div>`;}
  function formatDate(value){return new Intl.DateTimeFormat('ko-KR',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(value));}
  const claimForm=document.getElementById('certificateClaimForm'),claimNumber=document.getElementById('certificateClaimNumber'),claimFile=document.getElementById('certificateClaimFile'),claimFileName=document.getElementById('claimFileName'),claimSubmit=document.getElementById('certificateClaimSubmit'),claimStatus=document.getElementById('certificateClaimStatus');
  function renderClaims(){
    const list=document.getElementById('certificateClaimList'),visibleClaims=certificateClaims.filter(claim=>!claim.hiddenAt);
    list.innerHTML=visibleClaims.length?visibleClaims.map(claim=>`<article class="claim-item" data-claim-id="${escapeHtml(claim.id)}"><span>PDF</span><div><strong>${escapeHtml(claim.certificateNumber)}</strong><small>${escapeHtml(formatDate(claim.createdAt))} 인증</small></div><div class="claim-item-actions"><b>인증 완료</b><button type="button" data-claim-path="${escapeHtml(claim.filePath)}">PDF 보기</button></div><em>숨기기</em></article>`).join(''):'<p class="claim-empty">표시 중인 인증 내역이 없습니다.</p>';
  }
  async function isPdfFile(file){
    if(!file||file.size>5*1024*1024||(!/\.pdf$/i.test(file.name)&&file.type!=='application/pdf'))return false;
    const header=new Uint8Array(await file.slice(0,4).arrayBuffer());
    return String.fromCharCode(...header)==='%PDF';
  }
  claimFile.addEventListener('change',()=>{const file=claimFile.files&&claimFile.files[0];claimFileName.textContent=file?file.name:'확인서 PDF 선택';});
  document.getElementById('certificateClaimList').addEventListener('click',async event=>{
    const button=event.target.closest('[data-claim-path]');if(!button)return;
    const preview=window.open('about:blank','_blank');if(preview)preview.opener=null;
    button.disabled=true;button.textContent='여는 중…';
    try{const url=await cloud.getClaimUrl(button.dataset.claimPath);if(preview)preview.location=url;else window.location.href=url;}
    catch(error){console.error(error);if(preview)preview.close();showToast('PDF를 열지 못했습니다. 다시 시도해 주세요.');}
    finally{button.disabled=false;button.textContent='PDF 보기';}
  });
  const claimList=document.getElementById('certificateClaimList');
  let claimDrag=null,claimHoldTimer=null;
  function resetClaimDrag(card){clearTimeout(claimHoldTimer);claimHoldTimer=null;if(card){card.classList.remove('is-dragging','will-delete');card.style.transform='';}claimDrag=null;}
  claimList.addEventListener('pointerdown',event=>{
    if(event.target.closest('button'))return;const card=event.target.closest('[data-claim-id]');if(!card)return;
    claimDrag={card,startX:event.clientX,currentX:event.clientX,active:false,pointerId:event.pointerId};
    card.setPointerCapture(event.pointerId);claimHoldTimer=setTimeout(()=>{if(claimDrag&&claimDrag.card===card){claimDrag.active=true;card.classList.add('is-dragging');if(navigator.vibrate)navigator.vibrate(25);}},400);
  });
  claimList.addEventListener('pointermove',event=>{
    if(!claimDrag||claimDrag.pointerId!==event.pointerId)return;claimDrag.currentX=event.clientX;
    if(!claimDrag.active){if(Math.abs(event.clientX-claimDrag.startX)>10)resetClaimDrag(claimDrag.card);return;}
    const distance=Math.max(-105,Math.min(0,event.clientX-claimDrag.startX));claimDrag.card.style.transform=`translateX(${distance}px)`;claimDrag.card.classList.toggle('will-delete',distance<=-80);if(distance<0)event.preventDefault();
  });
  async function finishClaimDrag(event){
    if(!claimDrag||claimDrag.pointerId!==event.pointerId)return;const state=claimDrag,shouldDelete=state.active&&state.currentX-state.startX<=-80;resetClaimDrag(state.card);if(!shouldDelete)return;
    const claim=certificateClaims.find(item=>item.id===state.card.dataset.claimId);if(!claim||!confirm(`${claim.certificateNumber} 내역을 목록에서 숨길까요? 인증 기록과 PDF는 유지됩니다.`))return;
    try{await cloud.hideClaim(claim);claim.hiddenAt=new Date().toISOString();renderClaims();showToast('화면에서만 숨겼습니다. 인증 기록과 PDF는 유지됩니다.');}catch(error){console.error(error);showToast('인증 내역을 숨기지 못했습니다.');}
  }
  claimList.addEventListener('pointerup',finishClaimDrag);claimList.addEventListener('pointercancel',event=>{if(claimDrag&&claimDrag.pointerId===event.pointerId)resetClaimDrag(claimDrag.card);});
  claimNumber.addEventListener('input',()=>{claimNumber.value=claimNumber.value.toUpperCase().replace(/\s/g,'');});
  document.querySelectorAll('[data-benefit]').forEach(button=>button.addEventListener('click',()=>showToast(`${button.dataset.benefit}은 시연용 버튼입니다. 실제 기관 연계가 필요합니다.`)));
  claimForm.addEventListener('submit',async event=>{
    event.preventDefault();
    const number=claimNumber.value.trim().toUpperCase(),file=claimFile.files&&claimFile.files[0];
    if(!cloudReady){showToast('온라인 연결 후 확인서를 인증할 수 있습니다.');return;}
    if(!/^NF-DEMO-[0-9]{4}-[0-9]{6}$/.test(number)){showToast('확인번호 형식을 확인해 주세요.');return;}
    if(!(await isPdfFile(file))){showToast('5MB 이하의 올바른 PDF 확인서를 선택해 주세요.');return;}
    claimSubmit.disabled=true;claimSubmit.textContent='확인서 인증 중…';claimStatus.textContent='PDF를 안전한 비공개 저장공간에 올리고 있습니다.';
    try{
      const saved=await cloud.submitClaim(number,file);certificateClaims.unshift(saved);renderClaims();claimForm.reset();claimFileName.textContent='확인서 PDF 선택';claimStatus.textContent='인증 완료 · 지원 혜택을 확인할 수 있습니다.';showToast('확인서 인증이 완료되었습니다.');
    }catch(error){
      console.error(error);const duplicate=error&&error.code==='23505';claimStatus.textContent=duplicate?'이미 인증된 확인번호입니다.':'인증에 실패했습니다. 잠시 후 다시 시도해 주세요.';showToast(claimStatus.textContent);
    }finally{claimSubmit.disabled=false;claimSubmit.textContent='확인서 인증하기';}
  });
  function renderReports(){
    reportLayer.clearLayers();const board=document.getElementById('reportBoard');document.getElementById('reportCount').textContent=`${observations.length}건의 관찰 기록`;
    if(!observations.length){board.innerHTML='<div class="empty-board"><b>아직 등록된 관찰이 없습니다.</b>GPS 또는 지도 핀으로 첫 번째 현장 기록을 남겨보세요.</div>';return;}
    board.innerHTML=observations.slice().reverse().map(r=>{const info=speciesInfo[r.species]||['●','관찰'],radius=Number(r.activityRadiusKm)||1,deleteButton=(!cloudMode||r.canDelete)?`<button type="button" class="delete-report" data-delete-id="${r.id}" aria-label="${escapeHtml(r.species)} 신고 삭제">삭제</button>`:'';return `<article class="report-card${r.photo?' has-photo':''}" data-report-id="${r.id}">${photoButton(r,'report-photo')}<span class="report-icon">${info[0]}</span><div><h3>${escapeHtml(r.species)}</h3><p>${r.note?escapeHtml(r.note):'추가 관찰 내용 없음'}</p><p class="report-meta">추정 반경 ${radius.toFixed(1)} km · ${formatDate(r.createdAt)} · ${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}</p></div>${deleteButton}</article>`;}).join('');
    observations.forEach(r=>{const info=speciesInfo[r.species]||['●'],radius=Number(r.activityRadiusKm)||1,popup=reportPopup(r),popupOptions={minWidth:r.photo?340:220,maxWidth:r.photo?420:300,className:r.photo?'photo-wide-popup':''};L.circle([r.lat,r.lng],{radius:radius*1000,color:'#ef765f',weight:1.5,dashArray:'6 5',fillColor:'#ef765f',fillOpacity:.11}).bindTooltip(`${r.species} · 사용자 설정 추정 활동권`,{sticky:true}).bindPopup(popup,popupOptions).addTo(reportLayer);L.marker([r.lat,r.lng],{icon:L.divIcon({className:'',html:`<span class="report-icon" style="width:31px;height:31px;border:2px solid white;box-shadow:0 3px 9px #002b3d80">${info[0]}</span>`,iconSize:[31,31],iconAnchor:[15,15]})}).bindTooltip(r.species,{className:'report-tooltip',direction:'top'}).bindPopup(popup,popupOptions).addTo(reportLayer);});
  }
  document.getElementById('reportForm').addEventListener('submit',async e=>{
    e.preventDefault();if(photoProcessing){showToast('사진을 준비하고 있습니다. 잠시 후 다시 등록해 주세요.');return;}if(!draftMarker){showToast('먼저 GPS 또는 지도에서 관찰 위치를 정해 주세요.');return;}if(!speciesSelect.value){showToast('발견 생물종을 선택해 주세요.');return;}
    const p=draftMarker.getLatLng(),report={id:`r-${Date.now()}-${Math.random().toString(16).slice(2)}`,lat:p.lat,lng:p.lng,species:speciesSelect.value,note:document.getElementById('reportNote').value.trim(),photo:pendingPhoto,activityRadiusKm:Number(activityRange.value),createdAt:new Date().toISOString()};
    if(cloudReady){try{const saved=await cloud.create(report);observations.push(saved);}catch(error){console.error(error);showToast('온라인 신고 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.');return;}}else{observations.push(report);if(!saveReports()){observations.pop();return;}}renderReports();reportLayer.eachLayer(layer=>{if(layer.getLatLng&&layer.getLatLng().distanceTo(p)<2)layer.openPopup();});
    speciesSelect.value='';document.getElementById('reportNote').value='';clearPendingPhoto();speciesPreview.textContent='종을 선택하면 지도 표시에 사용할 분류가 나타납니다.';showToast(`${report.species} 관찰 신고를 저장했습니다.`);document.getElementById('reports').scrollIntoView({behavior:'smooth',block:'start'});
  });
  document.getElementById('reportBoard').addEventListener('click',async e=>{const deleteButton=e.target.closest('[data-delete-id]');if(deleteButton){e.stopPropagation();const report=observations.find(r=>r.id===deleteButton.dataset.deleteId);if(!report)return;try{if(cloudReady)await cloud.remove(report);observations=observations.filter(r=>r.id!==report.id);if(!cloudReady)saveReports();renderReports();showToast('관찰 기록을 삭제했습니다.');}catch(error){console.error(error);showToast('온라인 기록을 삭제하지 못했습니다.');}return;}const card=e.target.closest('[data-report-id]');if(!card)return;const report=observations.find(r=>r.id===card.dataset.reportId);if(report){map.setView([report.lat,report.lng],15);document.getElementById('watch-map').scrollIntoView({behavior:'smooth'});}});
  document.getElementById('clearReports').addEventListener('click',async()=>{const targets=cloudReady?observations.filter(r=>r.canDelete):observations;if(!targets.length){showToast(cloudReady?'내가 삭제할 수 있는 관찰 기록이 없습니다.':'지울 관찰 기록이 없습니다.');return;}if(confirm(cloudReady?'내가 등록한 온라인 관찰 기록을 모두 지울까요?':'이 기기에 저장된 관찰 기록을 모두 지울까요?')){try{if(cloudReady)await Promise.all(targets.map(r=>cloud.remove(r)));const ids=new Set(targets.map(r=>r.id));observations=observations.filter(r=>!ids.has(r.id));if(!cloudReady)saveReports();renderReports();showToast('내 관찰 기록을 모두 삭제했습니다.');}catch(error){console.error(error);showToast('일부 온라인 기록을 삭제하지 못했습니다.');}}});
  const photoDialog=document.getElementById('photoDialog'),photoDialogImage=document.getElementById('photoDialogImage'),photoDialogMeta=document.getElementById('photoDialogMeta');
  document.addEventListener('click',e=>{const button=e.target.closest('[data-photo-id]');if(!button)return;e.preventDefault();e.stopPropagation();const report=observations.find(r=>r.id===button.dataset.photoId);if(!report||!report.photo)return;photoDialogImage.src=report.photo;photoDialogMeta.textContent=`${report.species} · ${formatDate(report.createdAt)} · 사용자 현장 관찰`;photoDialog.showModal();});
  document.getElementById('closePhotoDialog').addEventListener('click',()=>photoDialog.close());
  photoDialog.addEventListener('click',e=>{if(e.target===photoDialog)photoDialog.close();});
  let toastTimer;function showToast(message){const toast=document.getElementById('toast');toast.textContent=message;toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('show'),2600);}
  async function initializeReports(){
    if(!cloudMode){renderReports();renderClaims();claimStatus.textContent='Supabase 설정이 필요해 현재 인증할 수 없습니다.';return;}
    try{
      cloudReady=await cloud.initialize();
      [observations,certificateClaims]=await Promise.all([cloud.list(),cloud.listClaims()]);
      renderReports();renderClaims();claimStatus.textContent='확인번호와 PDF를 제출하면 지원 혜택을 확인할 수 있습니다.';
      cloud.subscribe(async()=>{try{observations=await cloud.list();renderReports();}catch(error){console.error(error);}});
      document.getElementById('clearReports').textContent='내가 올린 기록 지우기';
      showToast('온라인 관찰 게시판에 연결했습니다.');
    }catch(error){
      console.error(error);cloudReady=false;observations=loadReports();renderReports();renderClaims();claimStatus.textContent='온라인 연결에 실패해 현재 인증할 수 없습니다.';
      showToast('온라인 연결에 실패해 이 기기에만 저장합니다.');
    }
  }
  initializeReports();
})();

