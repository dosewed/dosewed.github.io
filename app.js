/* 도결 Interactive Invitation
   - Scroll reveal (IntersectionObserver)
   - 3D tilt card
   - Canvas heart particles + mouse glow
   - Custom cursor
   - Lightbox
   - Guestbook(localStorage)
   - Share(Web Share / Clipboard)
   - Settings modal
   - Countdown (sample date)
*/

(() => {
  const $ = (q, el=document) => el.querySelector(q);
  const $$ = (q, el=document) => [...el.querySelectorAll(q)];

  // -------------------------
  // Basic config
  // -------------------------
  const state = {
    particles: true,
    cursor: true,
    tilt: true,
    snap: true,
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    // ⚠️ 여기 날짜만 너희 도결 날짜로 바꾸면 D-day 카운트다운 됨!
    weddingDateISO: "2026-01-23T23:00:00+09:00"
  };

  // Restore settings
  const saved = safeParse(localStorage.getItem("do_settings"));
  if (saved) Object.assign(state, saved);

  // Apply initial toggles
  applyToggles();

  // -------------------------
  // Scroll jump
  // -------------------------
  $$("[data-jump]").forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-jump");
      const node = $(target);
      node?.scrollIntoView({ behavior: state.reducedMotion ? "auto" : "smooth", block: "start" });
    });
  });

  // -------------------------
  // Scroll reveal
  // -------------------------
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) e.target.classList.add("is-in");
    }
  }, { threshold: 0.12 });

  $$("[data-reveal]").forEach(el => io.observe(el));

  // -------------------------
  // Custom cursor
  // -------------------------
  const cursor = $(".cursor");
  const dot = $(".cursor-dot");
  let mx = window.innerWidth/2, my = window.innerHeight/2;
  let cx = mx, cy = my, dx = mx, dy = my;

  window.addEventListener("mousemove", (e) => {
    mx = e.clientX; my = e.clientY;
  }, { passive: true });

  // smooth cursor
  function tickCursor(){
    dx += (mx - dx) * 0.22;
    dy += (my - dy) * 0.22;
    cx += (mx - cx) * 0.12;
    cy += (my - cy) * 0.12;

    if (cursor) cursor.style.transform = `translate(${dx}px, ${dy}px) translate(-50%,-50%)`;
    if (dot) dot.style.transform = `translate(${cx}px, ${cy}px) translate(-50%,-50%)`;

    requestAnimationFrame(tickCursor);
  }
  tickCursor();

  // Hover states
  const hoverables = "button,a,input,textarea,label,.shot,.profile,.panel,.mini";
  $$(hoverables).forEach(el => {
    el.addEventListener("mouseenter", () => cursor?.classList.add("hover"));
    el.addEventListener("mouseleave", () => cursor?.classList.remove("hover"));
  });

  // -------------------------
  // 3D tilt hero card
  // -------------------------
  const tilt = $("#tiltCard");
  if (tilt) {
    tilt.addEventListener("mousemove", (e) => {
      if (!state.tilt || state.reducedMotion) return;
      const r = tilt.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      const rotY = (px - 0.5) * 18;
      const rotX = (0.5 - py) * 14;

      tilt.style.transform = `perspective(900px) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
      tilt.style.setProperty("--gx", `${px*100}%`);
      tilt.style.setProperty("--gy", `${py*100}%`);
    });

    tilt.addEventListener("mouseleave", () => {
      tilt.style.transform = `perspective(900px) rotateX(0deg) rotateY(0deg)`;
    });
  }

  // -------------------------
  // Copy line
  // -------------------------
  $("#copyLine")?.addEventListener("click", async () => {
    const text = "우리 도결합니다.";
    await copyText(text);
    toast(`복사 완료: ${text}`);
  });

  // -------------------------
  // Share profile cards
  // -------------------------
  $$(".share").forEach(btn => {
    btn.addEventListener("click", async () => {
      const type = btn.getAttribute("data-share");
      const title = type === "groom"
        ? "신랑측 아스트라(Azure_st)"
        : "신부측 느리(itsNeuri_)";

      const msg = `도결 초대장 - ${title}\n우리 도결합니다.`;
      await smartShare({ title: "도결 Invitation", text: msg, url: location.href });
    });
  });

  // -------------------------
  // Gallery lightbox
  // -------------------------
  const lightbox = $("#lightbox");
  const mockImage = $("#mockImage");
  const lightboxTitle = $("#lightboxTitle");

  // 실제 이미지 URL 넣고 싶으면 여기만 바꾸면 됨.
  const shots = [
    { id: 1, title: "곤충관 싫어!", url: "https://cdn.discordapp.com/attachments/1408725803591536701/1463492647321862267/image.png?ex=6972073d&is=6970b5bd&hm=0bd1eb6cccf8e04fb48f55a3ba796ba6b7b7de8dc0d78beb4980651932866cb9&" },
    { id: 2, title: "노을은 진다!", url: "https://cdn.discordapp.com/attachments/1408725803591536701/1463493625571967067/image.png?ex=69720826&is=6970b6a6&hm=2c927d9dbe5cb477ed0bf7301e44c61ebaf8870fc589a48027e890eefa84807a&" },
    { id: 3, title: "오붓한 시간", url: "https://cdn.discordapp.com/attachments/1461759970642104533/1462719144301690942/image.png?ex=6971d9dc&is=6970885c&hm=8d56bfd6313050a86e477dad959309ae3d5bdc4a14ad4ae0a0be3fb415799795&" },
    { id: 4, title: "본격적인 준비", url: "https://cdn.discordapp.com/attachments/1461759970642104533/1462705989366055080/image.png?ex=6971cd9b&is=69707c1b&hm=c82b8a35a2e9fb4b87ccc0e0be1fd3a8e7d9de8587e1624aed26941b0546d1b9&" },
    { id: 5, title: "여긴 어딜까요", url: "https://cdn.discordapp.com/attachments/1408725803591536701/1463494833111957662/image.png?ex=69720946&is=6970b7c6&hm=14fac59c104524eb70ac2122e13aa2a6047173f4c27e3c26b5f45c92dbbe40e9&" },
    { id: 6, title: "꽃 단장", url: "https://cdn.discordapp.com/attachments/1408725803591536701/1463495276626051239/image1.png?ex=697209b0&is=6970b830&hm=9bbeb7c04bd87b6f82b05ceb51e4447d7748d714c99cbf7acced16adbbc83668&" },
  ];

  $$(".shot").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = Number(btn.getAttribute("data-shot"));
      const s = shots.find(x => x.id === id) || shots[0];
      openLightbox(s);
    });
  });

  function openLightbox(s){
    if (!lightbox) return;
    lightbox.hidden = false;
    document.body.style.overflow = "hidden";
    lightboxTitle.textContent = `Snap ${String(s.id).padStart(2,"0")} — ${s.title}`;

    if (s.url) {
      mockImage.style.backgroundImage = `url(${s.url})`;
      mockImage.style.backgroundSize = "cover";
      mockImage.style.backgroundPosition = "center";
    } else {
      mockImage.style.backgroundImage = "";
      mockImage.style.backgroundSize = "";
    }
  }

  function closeLightbox(){
    if (!lightbox) return;
    lightbox.hidden = true;
    document.body.style.overflow = "";
  }

  $$("#lightbox [data-close]").forEach(el => el.addEventListener("click", closeLightbox));
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && lightbox && !lightbox.hidden) closeLightbox();
    if (e.key === "Escape" && settings && !settings.hidden) closeSettings();
  });

  // mouse glow inside mock image
  mockImage?.addEventListener("mousemove", (e) => {
    const r = mockImage.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    mockImage.style.setProperty("--mx", `${px*100}%`);
    mockImage.style.setProperty("--my", `${py*100}%`);
  });

  // Demo "download"
  $("#downloadShot")?.addEventListener("click", async () => {
    toast("안돼지롱");
  });

  // -------------------------
  // Timeline add moment (local)
  // -------------------------
  $("#addMoment")?.addEventListener("click", async () => {
    const text = prompt("추억 한 줄을 입력해줘요 (예: '비 오는 날, 우산 아래에서…')")?.trim();
    if (!text) return;

    const li = document.createElement("li");
    li.innerHTML = `
      <div class="t-dot"></div>
      <div class="t-body">
        <div class="t-title">추억</div>
        <div class="t-desc"></div>
      </div>
    `;
    li.querySelector(".t-desc").textContent = text;

    $("#timeline")?.appendChild(li);
    persistTimeline();
    toast("추억이 추가됐어요 ✦");
  });

  function persistTimeline(){
    const items = $$("#timeline .t-desc").map(x => x.textContent || "");
    localStorage.setItem("do_timeline", JSON.stringify(items));
  }
  // restore timeline additions
  const tSaved = safeParse(localStorage.getItem("do_timeline"));
  if (Array.isArray(tSaved) && tSaved.length) {
    // skip first 3 built-ins, just append saved as "추억"
    for (const text of tSaved) {
      if (!text) continue;
      const li = document.createElement("li");
      li.innerHTML = `
        <div class="t-dot"></div>
        <div class="t-body">
          <div class="t-title">추억</div>
          <div class="t-desc"></div>
        </div>
      `;
      li.querySelector(".t-desc").textContent = text;
      $("#timeline")?.appendChild(li);
    }
  }

  // -------------------------
  // Guestbook (RSVP)
  // -------------------------
  const form = $("#rsvpForm");
  const list = $("#guestList");
  const KEY = "do_guestbook";

  renderGuests();

  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const name = String(fd.get("name") || "").trim();
    const attend = String(fd.get("attend") || "참석");
    const msg = String(fd.get("msg") || "").trim();

    if (!name) return toast("이름/닉네임을 적어줘요!");

    const entry = {
      name,
      attend,
      msg,
      ts: new Date().toISOString()
    };

    const arr = safeParse(localStorage.getItem(KEY)) || [];
    arr.unshift(entry);
    localStorage.setItem(KEY, JSON.stringify(arr));

    form.reset();
    // keep radio default
    $("#attend-yes").checked = true;
    renderGuests();
    toast("저장 완료! ❤");
  });

  $("#clearRsvp")?.addEventListener("click", () => {
    if (!confirm("로컬에 저장된 방명록을 모두 지울까요?")) return;
    localStorage.removeItem(KEY);
    renderGuests();
    toast("초기화 완료");
  });

  $("#copyGuests")?.addEventListener("click", async () => {
    const arr = safeParse(localStorage.getItem(KEY)) || [];
    if (!arr.length) return toast("복사할 메시지가 없어요!");
    const text = arr.map(x => {
      const t = formatKST(x.ts);
      return `- ${x.name} (${x.attend}) [${t}]\n  ${x.msg || "(메시지 없음)"}`;
    }).join("\n\n");
    await copyText(text);
    toast("방명록 텍스트 복사 완료");
  });

  function renderGuests(){
    const arr = safeParse(localStorage.getItem(KEY)) || [];
    if (!list) return;

    list.innerHTML = "";
    if (!arr.length){
      const empty = document.createElement("div");
      empty.className = "empty dim";
      empty.textContent = "아직 메시지가 없어요. 첫 번째로 남겨줘요!";
      list.appendChild(empty);
      return;
    }

    for (const it of arr.slice(0, 40)) {
      const div = document.createElement("div");
      div.className = "guest";
      div.innerHTML = `
        <div class="top">
          <div class="name"></div>
          <div class="badge"></div>
        </div>
        <div class="msg"></div>
      `;
      div.querySelector(".name").textContent = it.name;
      div.querySelector(".badge").textContent = it.attend;
      div.querySelector(".msg").textContent = it.msg || " ";
      list.appendChild(div);
    }
  }

  // -------------------------
  // Countdown
  // -------------------------
  const cd = $("#countdown");
  function tickCountdown(){
    if (!cd) return;
    const target = new Date(state.weddingDateISO).getTime();
    const now = Date.now();
    let diff = target - now;

    const sign = diff >= 0 ? 1 : -1;
    diff = Math.abs(diff);

    const d = Math.floor(diff / (24*3600e3));
    diff -= d * 24*3600e3;
    const h = Math.floor(diff / 3600e3);
    diff -= h * 3600e3;
    const m = Math.floor(diff / 60e3);
    diff -= m * 60e3;
    const s = Math.floor(diff / 1000);

    const label = sign >= 0 ? `D-${d}` : `D+${d}`;
    cd.textContent = `${label} ${pad2(h)}:${pad2(m)}:${pad2(s)}`;
  }
  tickCountdown();
  setInterval(tickCountdown, 1000);

  // -------------------------
  // Settings modal
  // -------------------------
  const settings = $("#settings");
  $("#openSettings")?.addEventListener("click", openSettings);
  $$("#settings [data-close]").forEach(el => el.addEventListener("click", closeSettings));

  $("#toggleParticles")?.addEventListener("change", (e) => {
    state.particles = e.target.checked;
    persistSettings();
    toast(state.particles ? "파티클 ON" : "파티클 OFF");
  });
  $("#toggleCursor")?.addEventListener("change", (e) => {
    state.cursor = e.target.checked;
    applyToggles();
    persistSettings();
  });
  $("#toggleTilt")?.addEventListener("change", (e) => {
    state.tilt = e.target.checked;
    persistSettings();
    toast(state.tilt ? "틸트 ON" : "틸트 OFF");
  });
  $("#toggleSnap")?.addEventListener("change", (e) => {
    state.snap = e.target.checked;
    applyToggles();
    persistSettings();
  });

  function openSettings(){
    if (!settings) return;
    settings.hidden = false;
    document.body.style.overflow = "hidden";
    $("#toggleParticles").checked = state.particles;
    $("#toggleCursor").checked = state.cursor;
    $("#toggleTilt").checked = state.tilt;
    $("#toggleSnap").checked = state.snap;
  }
  function closeSettings(){
    if (!settings) return;
    settings.hidden = true;
    document.body.style.overflow = "";
  }

  function persistSettings(){
    localStorage.setItem("do_settings", JSON.stringify({
      particles: state.particles,
      cursor: state.cursor,
      tilt: state.tilt,
      snap: state.snap,
      weddingDateISO: state.weddingDateISO
    }));
  }

  function applyToggles(){
    document.body.classList.toggle("cursor-on", state.cursor && !state.reducedMotion);
    document.body.classList.toggle("snap-on", state.snap && !state.reducedMotion);
  }

    // -------------------------
  // Mood sound (mp3 file)
  // Audio: background music from '노래.mp3'
  // -------------------------
 // -------------------------
// Mood sound (mp3 auto-play attempt)
// -------------------------
let audioOn = false;
let bgm = null;

function initBGM() {
  if (bgm) return;

  bgm = new Audio("./노래.mp3");
  bgm.loop = true;
  bgm.volume = 0.28;
  bgm.preload = "auto";
}

async function tryPlayBGM(fromUser = false) {
  if (!bgm) initBGM();

  try {
    await bgm.play();
    audioOn = true;
    if (fromUser) toast("배경음 ON ♪");
  } catch (e) {
    // 자동재생 차단됨 → 첫 클릭에서 다시 시도
    if (!fromUser) {
      const resume = async () => {
        try {
          await bgm.play();
          audioOn = true;
          toast("배경음 ON ♪");
        } catch {}
        document.removeEventListener("click", resume);
        document.removeEventListener("touchstart", resume);
      };
      document.addEventListener("click", resume, { once: true });
      document.addEventListener("touchstart", resume, { once: true });
    }
  }
}

// 🔥 페이지 들어오자마자 자동재생 시도
window.addEventListener("DOMContentLoaded", () => {
  tryPlayBGM(false);
});

// 🎵 기존 버튼은 그대로 유지
$("#toggleMusic")?.addEventListener("click", async () => {
  if (!bgm) initBGM();

  if (!audioOn) {
    await tryPlayBGM(true);
  } else {
    bgm.pause();
    bgm.currentTime = 0;
    audioOn = false;
    toast("배경음 OFF");
  }
});


  // -------------------------
  // Canvas heart particles
  // -------------------------
  const canvas = $("#fx");
  const ctx = canvas?.getContext("2d");
  let W=0,H=0, dpr = Math.min(window.devicePixelRatio || 1, 2);

  function resize(){
    if (!canvas || !ctx) return;
    W = canvas.width = Math.floor(innerWidth * dpr);
    H = canvas.height = Math.floor(innerHeight * dpr);
    canvas.style.width = innerWidth + "px";
    canvas.style.height = innerHeight + "px";
    ctx.setTransform(1,0,0,1,0,0);
  }
  window.addEventListener("resize", resize);
  resize();

  const hearts = [];
  const MAX = 120;

  function spawnHeart(x, y, burst=false){
    if (!state.particles || state.reducedMotion) return;
    const n = burst ? 10 : 1;
    for (let i=0;i<n;i++){
      hearts.push(new Heart(x*dpr, y*dpr, burst));
      if (hearts.length > MAX) hearts.shift();
    }
  }

  class Heart{
    constructor(x,y,burst){
      this.x = x; this.y = y;
      this.vx = (Math.random() - .5) * (burst ? 2.2 : 0.8) * dpr;
      this.vy = (-Math.random()*1.6 - 0.6) * (burst ? 1.1 : 0.8) * dpr;
      this.r = (Math.random()*10 + 8) * dpr;
      this.life = 0;
      this.ttl = (Math.random()*90 + 100) * (burst ? 0.9 : 1.1);
      this.rot = (Math.random()*Math.PI*2);
      this.spin = (Math.random() - .5) * 0.08;
      this.hue = 330 + Math.random()*30; // pink-ish
    }
    step(){
      this.life++;
      this.x += this.vx;
      this.y += this.vy;
      this.vy += 0.010*dpr;
      this.rot += this.spin;
    }
    draw(ctx){
      const t = this.life / this.ttl;
      if (t >= 1) return false;

      const a = (1 - t) * 0.9;
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rot);
      ctx.globalAlpha = a;
      ctx.fillStyle = `hsla(${this.hue}, 92%, 70%, ${a})`;
      ctx.shadowColor = `hsla(${this.hue}, 92%, 70%, ${a})`;
      ctx.shadowBlur = 22 * dpr;

      drawHeart(ctx, 0, 0, this.r);
      ctx.restore();
      return true;
    }
  }

  function drawHeart(ctx, x, y, size){
    // parametric-ish heart
    const s = size;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x - s*0.6, y - s*0.6, x - s*1.3, y + s*0.2, x, y + s);
    ctx.bezierCurveTo(x + s*1.3, y + s*0.2, x + s*0.6, y - s*0.6, x, y);
    ctx.closePath();
    ctx.fill();
  }

  let last = 0;
  function loop(ts){
    if (!ctx || !canvas) return requestAnimationFrame(loop);
    const dt = ts - last; last = ts;

    ctx.clearRect(0,0,W,H);

    // subtle background glow following mouse
    const gx = mx*dpr, gy = my*dpr;
    ctx.save();
    ctx.globalAlpha = 0.22;
    const grad = ctx.createRadialGradient(gx,gy, 0, gx,gy, 240*dpr);
    grad.addColorStop(0, "rgba(255,111,174,.30)");
    grad.addColorStop(1, "rgba(255,111,174,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0,0,W,H);
    ctx.restore();

    // step hearts
    if (state.particles && !state.reducedMotion){
      for (let i=hearts.length-1;i>=0;i--){
        const h = hearts[i];
        h.step();
        if (!h.draw(ctx)) hearts.splice(i,1);
      }

      // occasional ambient hearts
      if (Math.random() < 0.07){
        const x = innerWidth*(0.15 + Math.random()*0.7);
        const y = innerHeight*(0.75 + Math.random()*0.2);
        spawnHeart(x, y, false);
      }
    }

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  window.addEventListener("click", (e) => {
    spawnHeart(e.clientX, e.clientY, true);
  }, { passive:true });

  // -------------------------
  // Settings sync checkboxes
  // -------------------------
  $("#toggleParticles") && ($("#toggleParticles").checked = state.particles);
  $("#toggleCursor") && ($("#toggleCursor").checked = state.cursor);
  $("#toggleTilt") && ($("#toggleTilt").checked = state.tilt);
  $("#toggleSnap") && ($("#toggleSnap").checked = state.snap);

  // -------------------------
  // Utilities
  // -------------------------
  function pad2(n){return String(n).padStart(2,"0")}
  function safeParse(s){ try{ return JSON.parse(s); }catch{ return null; } }

  async function copyText(text){
    try{
      await navigator.clipboard.writeText(text);
      return true;
    }catch{
      // fallback
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      return true;
    }
  }

  async function smartShare({title, text, url}){
    try{
      if (navigator.share){
        await navigator.share({ title, text, url });
        toast("공유 완료 ✦");
        return;
      }
    }catch(e){
      // user cancelled share -> ignore
    }
    await copyText(`${text}\n${url}`);
    toast("공유 링크를 클립보드에 복사했어요 ⎘");
  }

  function toast(message){
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = message;
    document.body.appendChild(el);

    requestAnimationFrame(() => el.classList.add("in"));
    setTimeout(() => el.classList.remove("in"), 2200);
    setTimeout(() => el.remove(), 2800);
  }

  function formatKST(iso){
    try{
      const d = new Date(iso);
      return d.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
    }catch{
      return iso;
    }
  }

  // -------------------------
  // Toast CSS injection (small, self-contained)
  // -------------------------
  const toastCss = document.createElement("style");
  toastCss.textContent = `
    .toast{
      position:fixed;
      left:50%;
      bottom:22px;
      transform: translateX(-50%) translateY(14px);
      padding: 12px 14px;
      border-radius: 16px;
      background: rgba(20,10,20,.62);
      border:1px solid rgba(255,255,255,.14);
      color: rgba(255,255,255,.92);
      backdrop-filter: blur(14px);
      z-index:120;
      opacity:0;
      filter: blur(8px);
      transition: opacity .35s cubic-bezier(.2,.9,.2,1), transform .35s cubic-bezier(.2,.9,.2,1), filter .45s cubic-bezier(.2,.9,.2,1);
      box-shadow: 0 18px 55px rgba(0,0,0,.35);
      max-width: min(740px, calc(100% - 18px));
      text-align:center;
      font-weight:900;
    }
    .toast.in{
      opacity:1;
      transform: translateX(-50%) translateY(0);
      filter: blur(0);
    }
  `;
  document.head.appendChild(toastCss);

  // -------------------------
  // Initial "cursor on" depending on settings
  // -------------------------
  if (state.cursor && !state.reducedMotion) document.body.classList.add("cursor-on");

})();
