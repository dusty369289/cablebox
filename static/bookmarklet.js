"use strict";(()=>{function I(e){if(!e)return 0;let n=e.trim().split(":").map(Number);return n.length===3?n[0]*3600+n[1]*60+n[2]:n.length===2?n[0]*60+n[1]:n.length===1?n[0]:0}function k(e){let n=Math.floor(e/3600),l=Math.floor(e%3600/60);return n>0?`${n}h${l}m`:`${l}m`}function B(e){return e.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")}function L(e){if(!e||!e.videoId)return null;let n=e.videoId,l=e.title?.runs?.[0]?.text||e.title?.simpleText||"",c=0,o="";if(e.lengthSeconds)c=parseInt(e.lengthSeconds,10),o=e.lengthText?.simpleText||"";else if(e.lengthText?.simpleText)o=e.lengthText.simpleText,c=I(o);else{let f=e.thumbnailOverlays||[];for(let m of f){let h=m.thumbnailOverlayTimeStatusRenderer;if(h?.text?.simpleText){o=h.text.simpleText,c=I(o);break}}}let r=e.thumbnailOverlays||[];for(let f of r){let m=f.thumbnailOverlayTimeStatusRenderer?.style;if(m==="SHORTS"||m==="LIVE")return null}if(c<60)return null;let u=`https://img.youtube.com/vi/${n}/mqdefault.jpg`,d=e.ownerText?.runs?.[0]?.text||e.shortBylineText?.runs?.[0]?.text||e.longBylineText?.runs?.[0]?.text||"",p=e.ownerText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId||e.shortBylineText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId||e.longBylineText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId||"",w=e.publishedTimeText?.simpleText||"",g=e.viewCountText?.simpleText||e.shortViewCountText?.simpleText||"";return{id:n,title:l,duration:c,durationText:o,thumbnail:u,channel:d,channelId:p,uploadedText:w,views:g}}function $(){let e=[],n=new Set,l=["ytd-rich-item-renderer","ytd-playlist-video-renderer","ytd-video-renderer","ytd-compact-video-renderer","ytd-grid-video-renderer"];for(let c of l){let o=document.querySelectorAll(c);for(let r of o){let u=r.data;if(!u)continue;let d=u.content?.videoRenderer||u,p=L(d);p&&!n.has(p.id)&&(n.add(p.id),e.push(p))}}return e}async function z(e){let n=0,l=0,c=3;for(;l<c;){window.scrollTo(0,document.documentElement.scrollHeight),await H(1500);let o=document.querySelectorAll("ytd-rich-item-renderer, ytd-playlist-video-renderer, ytd-video-renderer, ytd-grid-video-renderer").length;e(o),o===n?l++:l=0,n=o}window.scrollTo(0,0)}function H(e){return new Promise(n=>setTimeout(n,e))}function A(){document.getElementById("cs-panel")?.remove();let e=document.createElement("div");return e.id="cs-panel",e.innerHTML=`
		<style>
			#cs-panel {
				position: fixed;
				top: 20px;
				right: 20px;
				width: 420px;
				max-height: 80vh;
				background: #111;
				border: 2px solid #3a3;
				border-radius: 8px;
				font-family: 'Courier New', monospace;
				color: #ccc;
				z-index: 999999;
				display: flex;
				flex-direction: column;
				box-shadow: 0 8px 32px rgba(0,0,0,0.6);
			}
			#cs-panel * { box-sizing: border-box; }
			.cs-header {
				display: flex;
				justify-content: space-between;
				align-items: center;
				padding: 12px 16px;
				border-bottom: 1px solid #333;
				background: #0a1a0a;
				border-radius: 6px 6px 0 0;
			}
			.cs-title { color: #3a3; font-weight: bold; font-size: 14px; }
			.cs-close {
				background: none; border: none; color: #666;
				font-size: 18px; cursor: pointer; padding: 0;
			}
			.cs-close:hover { color: #f33; }
			.cs-status {
				padding: 8px 16px;
				font-size: 12px;
				color: #888;
				border-bottom: 1px solid #222;
			}
			.cs-filters {
				padding: 10px 16px;
				border-bottom: 1px solid #222;
				display: flex;
				flex-direction: column;
				gap: 8px;
			}
			.cs-filter-row {
				display: flex;
				gap: 8px;
				align-items: center;
				font-size: 12px;
			}
			.cs-filter-row label { min-width: 70px; color: #888; }
			.cs-filter-row input, .cs-filter-row select {
				background: #1a1a1a; border: 1px solid #333;
				color: #ccc; padding: 4px 8px; border-radius: 4px;
				font-family: inherit; font-size: 12px; flex: 1;
			}
			.cs-video-list {
				flex: 1;
				overflow-y: auto;
				max-height: 40vh;
			}
			.cs-video-item {
				padding: 6px 16px;
				font-size: 11px;
				border-bottom: 1px solid #1a1a1a;
				display: flex;
				gap: 8px;
				align-items: center;
			}
			.cs-video-item:hover { background: #1a2a1a; }
			.cs-video-item input[type=checkbox] { flex-shrink: 0; }
			.cs-video-info { flex: 1; overflow: hidden; }
			.cs-video-title {
				white-space: nowrap; overflow: hidden;
				text-overflow: ellipsis; color: #ddd;
			}
			.cs-video-meta { color: #666; font-size: 10px; margin-top: 2px; }
			.cs-actions {
				padding: 12px 16px;
				border-top: 1px solid #333;
				display: flex;
				flex-direction: column;
				gap: 8px;
			}
			.cs-export-row {
				display: flex; gap: 8px; align-items: center; font-size: 12px;
			}
			.cs-export-row label { min-width: 70px; color: #888; }
			.cs-export-row select, .cs-export-row input {
				background: #1a1a1a; border: 1px solid #333;
				color: #ccc; padding: 4px 8px; border-radius: 4px;
				font-family: inherit; font-size: 12px; flex: 1;
			}
			.cs-btn {
				background: #1a3a1a; border: 1px solid #3a3;
				color: #3a3; padding: 8px 16px; border-radius: 4px;
				font-family: inherit; font-size: 13px; font-weight: bold;
				cursor: pointer; text-align: center;
			}
			.cs-btn:hover { background: #2a4a2a; color: #5c5; }
			.cs-btn:disabled { opacity: 0.4; cursor: not-allowed; }
			.cs-btn-primary { background: #3a3; color: #000; }
			.cs-btn-primary:hover { background: #5c5; }
			.cs-summary {
				font-size: 11px; color: #888; text-align: center; padding: 4px;
			}
		</style>
		<div class="cs-header">
			<span class="cs-title">CHANNEL SURFER</span>
			<button class="cs-close" id="cs-close">&times;</button>
		</div>
		<div class="cs-status" id="cs-status">Ready to scan</div>
		<div style="padding: 10px 16px;">
			<button class="cs-btn" id="cs-scan" style="width:100%;">Scan Page</button>
		</div>
		<div class="cs-filters" id="cs-filters" style="display:none;">
			<div class="cs-filter-row">
				<label>Min duration</label>
				<input type="number" id="cs-min-dur" value="60" min="0" step="30" />
				<span style="color:#666;font-size:11px;">sec</span>
			</div>
			<div class="cs-filter-row">
				<label>Max videos</label>
				<input type="number" id="cs-max-count" value="0" min="0" placeholder="0 = all" />
			</div>
			<div class="cs-filter-row">
				<label>Channel</label>
				<select id="cs-channel-filter"><option value="">All channels</option></select>
			</div>
			<div class="cs-filter-row">
				<button class="cs-btn" id="cs-select-all" style="flex:1;">Select All</button>
				<button class="cs-btn" id="cs-select-none" style="flex:1;">Select None</button>
			</div>
		</div>
		<div class="cs-video-list" id="cs-video-list"></div>
		<div class="cs-actions" id="cs-actions" style="display:none;">
			<div class="cs-summary" id="cs-summary"></div>
			<div class="cs-export-row">
				<label>Group as</label>
				<select id="cs-grouping">
					<option value="single">One channel</option>
					<option value="split">Split by YT channel</option>
				</select>
			</div>
			<div class="cs-export-row" id="cs-name-row">
				<label>Name</label>
				<input type="text" id="cs-channel-name" placeholder="My Channel" />
			</div>
			<button class="cs-btn cs-btn-primary" id="cs-export">Copy to Clipboard</button>
		</div>
	`,document.body.appendChild(e),e}(function(){if(!window.location.hostname.includes("youtube.com")){alert("Channel Surfer: This bookmarklet only works on youtube.com");return}let n=A(),l=[],c=[],o=document.getElementById("cs-status"),r=document.getElementById("cs-scan"),u=document.getElementById("cs-filters"),d=document.getElementById("cs-video-list"),p=document.getElementById("cs-actions"),w=document.getElementById("cs-summary"),g=document.getElementById("cs-channel-filter"),f=document.getElementById("cs-min-dur"),m=document.getElementById("cs-max-count"),h=document.getElementById("cs-grouping"),T=document.getElementById("cs-channel-name"),M=document.getElementById("cs-name-row"),E=document.getElementById("cs-export");document.getElementById("cs-close").onclick=()=>n.remove(),r.onclick=async()=>{r.setAttribute("disabled",""),r.textContent="Scrolling...",o.textContent="Auto-scrolling to load all videos...",await z(a=>{o.textContent=`Scrolling... ${a} elements loaded`}),o.textContent="Extracting video data...",l=$(),o.textContent=`Found ${l.length} videos`;let t=[...new Set(l.map(a=>a.channel).filter(Boolean))].sort();g.innerHTML='<option value="">All channels</option>';for(let a of t){let s=document.createElement("option");s.value=a,s.textContent=a,g.appendChild(s)}let i=document.querySelector("ytd-channel-name yt-formatted-string")?.textContent||t[0]||"My Channel";T.value=i,u.style.display="",p.style.display="",r.textContent="Re-scan Page",r.removeAttribute("disabled"),b()},g.onchange=b,f.oninput=b,m.oninput=b,document.getElementById("cs-select-all").onclick=()=>{d.querySelectorAll("input[type=checkbox]").forEach(t=>{t.checked=!0}),v()},document.getElementById("cs-select-none").onclick=()=>{d.querySelectorAll("input[type=checkbox]").forEach(t=>{t.checked=!1}),v()},h.onchange=()=>{M.style.display=h.value==="single"?"":"none"},E.onclick=()=>{let t=C();if(t.length===0){o.textContent="No videos selected!";return}let i;if(h.value==="single"){let s=T.value.trim()||"Imported Channel";i=[{name:s,slug:B(s),number:0,category:"Imported",sources:[{type:"imported",videos:t.map(S)}]}]}else{let s=new Map;for(let x of t){let y=x.channel||"Unknown";s.has(y)||s.set(y,[]),s.get(y).push(x)}i=[...s.entries()].map(([x,y])=>({name:x,slug:B(x),number:0,category:"Imported",sources:[{type:"imported",videos:y.map(S)}]}))}let a=JSON.stringify(i,null,2);navigator.clipboard.writeText(a).then(()=>{let s=t.length,x=i.length;o.textContent=`Copied! ${s} videos in ${x} channel(s)`,E.textContent="Copied!",setTimeout(()=>{E.textContent="Copy to Clipboard"},2e3)}).catch(()=>{prompt("Copy this JSON:",a)})};function S(t){return{id:t.id,title:t.title,duration:t.duration,thumbnail:t.thumbnail}}function b(){let t=g.value,i=parseInt(f.value,10)||0,a=parseInt(m.value,10)||0;c=l.filter(s=>!(t&&s.channel!==t||s.duration<i)),a>0&&(c=c.slice(0,a)),V()}function V(){d.innerHTML="";for(let t of c){let i=document.createElement("div");i.className="cs-video-item",i.innerHTML=`
				<input type="checkbox" checked data-id="${t.id}" />
				<div class="cs-video-info">
					<div class="cs-video-title" title="${t.title}">${t.title}</div>
					<div class="cs-video-meta">
						${t.durationText||k(t.duration)}
						${t.channel?" \xB7 "+t.channel:""}
						${t.uploadedText?" \xB7 "+t.uploadedText:""}
						${t.views?" \xB7 "+t.views:""}
					</div>
				</div>
			`,i.querySelector("input").onchange=v,d.appendChild(i)}v()}function C(){let t=new Set;return d.querySelectorAll("input[type=checkbox]:checked").forEach(i=>t.add(i.dataset.id)),c.filter(i=>t.has(i.id))}function v(){let t=C(),i=t.reduce((a,s)=>a+s.duration,0);w.textContent=`${t.length} selected \xB7 ${k(i)} total`}})();})();
