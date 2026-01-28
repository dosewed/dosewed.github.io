// ===============================
// ✅ 설정: API 서버 주소 (그대로 유지)
// ===============================
const API_BASE = "https://image-klein-containing-hey.trycloudflare.com";

// localStorage keys
const LS_GENDER = "dating_viewer_gender_v1";
const LS_AUTO   = "dating_auto_refresh_v1";
const LS_SORT   = "dating_sort_v1";
const LS_Q      = "dating_query_v1";

const $ = (q, el=document) => el.querySelector(q);

const el = {
  btnBgm: $("#btnBgm"),
  bgmModal: $("#bgmModal"),
  btnCloseBgm: $("#btnCloseBgm"),
  btnBgmToggle: $("#btnBgmToggle"),
  bgmVol: $("#bgmVol"),
  bgmVolTxt: $("#bgmVolTxt"),

  grid: $("#grid"),
  empty: $("#empty"),
  statusText: $("#statusText"),
  chipViewer: $("#chipViewer"),
  chipShowing: $("#chipShowing"),
  chipApi: $("#chipApi"),

  btnRefresh: $("#btnRefresh"),
  btnGender: $("#btnGender"),
  btnShare: $("#btnShare"),

  q: $("#q"),
  sort: $("#sort"),
  auto: $("#auto"),

  genderModal: $("#genderModal"),
  btnCloseGender: $("#btnCloseGender"),

  profileModal: $("#profileModal"),
  btnCloseProfile: $("#btnCloseProfile"),
  btnCopy: $("#btnCopy"),

  pmName: $("#pmName"),
  pmMeta: $("#pmMeta"),
  pmJob: $("#pmJob"),
  pmAssets: $("#pmAssets"),
  pmBio: $("#pmBio"),
  pmCode: $("#pmCode"),

  toast: $("#toast"),

  fxCanvas: $("#fxCanvas"),
  cursor: $("#cursor"),
};

let state = {
  viewerGender: null, // "M" | "F"
  profilesRaw: [],
  profilesView: [],
  selected: null,
  autoTimer: null,
  mouse: { x: 0, y: 0, alive: false },
  reducedMotion: window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false,
  lastFetchOk: false,
};

// ===============================
// ✅ BGM (music.mp3)
// - 브라우저 정책상 "첫 사용자 상호작용" 이후 재생
// - 토글 상태 localStorage 저장
// - 버튼 클릭: 토글 / 버튼 우클릭: 설정(볼륨) 모달
// ===============================
const LS_BGM = "dating_bgm_on_v1";
const LS_BGM_VOL = "dating_bgm_vol_v1";

let bgm = {
  audio: null,
  ready: false,
  on: (localStorage.getItem(LS_BGM) ?? "1") === "1", // 기본 ON
  vol: Math.min(1, Math.max(0, Number(localStorage.getItem(LS_BGM_VOL) ?? 0.35))),
  unlocked: false,
};

function setupBgm(){
  // ✅ 파일 위치: index.html 기준
  //  - 같은 폴더면 "./music.mp3"
  //  - music 폴더면 "./music/music.mp3"
  const src = "./music.mp3";

  const a = new Audio(src);
  a.loop = true;
  a.preload = "auto";
  a.volume = bgm.vol;

  bgm.audio = a;
  bgm.ready = true;

  // 모달 초기값
  if (el.bgmVol) el.bgmVol.value = String(Math.round(bgm.vol * 100));
  if (el.bgmVolTxt) el.bgmVolTxt.textContent = `${Math.round(bgm.vol * 100)}%`;
  if (el.btnBgmToggle) el.btnBgmToggle.textContent = bgm.on ? "🔊 켜짐" : "🔇 꺼짐";

  updateBgmButton();

  // 첫 상호작용에 언락(오토플레이 정책 회피)
  const unlock = async () => {
    if (bgm.unlocked) return;
    bgm.unlocked = true;

    // ON이면 즉시 재생 시도
    if (bgm.on) await playBgmSafe();

    // 한번만 해도 되지만, 다양한 환경에서 안정적으로 하려고 제거도 같이 둠
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };

  window.addEventListener("pointerdown", unlock, { passive:true });
  window.addEventListener("keydown", unlock);

  // 상단 버튼: 클릭 = 토글
  el.btnBgm?.addEventListener("click", async () => {
    bgm.on = !bgm.on;
    localStorage.setItem(LS_BGM, bgm.on ? "1" : "0");
    updateBgmButton();

    if (!bgm.on){
      stopBgm();
      if (el.btnBgmToggle) el.btnBgmToggle.textContent = "🔇 꺼짐";
      showToast("BGM 꺼짐");
      return;
    }

    const ok = await playBgmSafe();
    if (el.btnBgmToggle) el.btnBgmToggle.textContent = "🔊 켜짐";
    showToast(ok ? "BGM 켜짐" : "클릭/터치 후 재생 가능");
  });

  // 상단 버튼: 우클릭 = 설정 모달
  el.btnBgm?.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    if (el.bgmModal) openModal(el.bgmModal);
  });

  // 버튼 위 휠로 볼륨(선택 기능 유지)
  el.btnBgm?.addEventListener("wheel", (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.03 : 0.03;
    setBgmVolume(bgm.vol + delta, true);
  }, { passive:false });

  // 모달 닫기
  el.btnCloseBgm?.addEventListener("click", () => closeModal(el.bgmModal));
  if (el.bgmModal) wireModalBackdropClose(el.bgmModal);

  // 모달 토글 버튼
  el.btnBgmToggle?.addEventListener("click", async () => {
    bgm.on = !bgm.on;
    localStorage.setItem(LS_BGM, bgm.on ? "1" : "0");
    updateBgmButton();
    el.btnBgmToggle.textContent = bgm.on ? "🔊 켜짐" : "🔇 꺼짐";

    if (!bgm.on){
      stopBgm();
      return;
    }
    await playBgmSafe();
  });

  // 모달 슬라이더
  el.bgmVol?.addEventListener("input", () => {
    const v = Number(el.bgmVol.value || 0);
    setBgmVolume(v / 100, false);
  });
}

function setBgmVolume(vol01, showToastVol){
  bgm.vol = Math.min(1, Math.max(0, Number(vol01)));
  localStorage.setItem(LS_BGM_VOL, String(bgm.vol));
  if (bgm.audio) bgm.audio.volume = bgm.vol;

  const pct = Math.round(bgm.vol * 100);
  if (el.bgmVol) el.bgmVol.value = String(pct);
  if (el.bgmVolTxt) el.bgmVolTxt.textContent = `${pct}%`;

  updateBgmButton(true);

  if (showToastVol) showToast(`볼륨 ${pct}%`);
}

async function playBgmSafe(){
  if (!bgm.audio) return false;
  try{
    await bgm.audio.play();
    return true;
  }catch{
    return false; // autoplay 차단
  }
}

function stopBgm(){
  if (!bgm.audio) return;
  try{ bgm.audio.pause(); }catch{}
  bgm.audio.currentTime = 0;
}

function updateBgmButton(showVol=false){
  if (!el.btnBgm) return;
  const icon = bgm.on ? "🔊" : "🔇";
  if (showVol){
    el.btnBgm.textContent = `${icon} BGM ${(bgm.vol*100)|0}%`;
    clearTimeout(updateBgmButton._t);
    updateBgmButton._t = setTimeout(() => {
      el.btnBgm.textContent = `${icon} BGM`;
    }, 900);
  } else {
    el.btnBgm.textContent = `${icon} BGM`;
  }
}

// ===============================
// ✅ 성별 유틸
// ===============================
function toMF(v){
  const s = (v ?? "").toString().trim().toUpperCase();
  if (s === "M" || s === "남" || s === "남자") return "M";
  if (s === "F" || s === "여" || s === "여자") return "F";
  return "";
}
function oppositeGender(g){ return g === "M" ? "F" : "M"; }
function genderLabel(g){ return g === "M" ? "남자" : g === "F" ? "여자" : "-"; }

// ===============================
// ✅ UI 유틸
// ===============================
function showToast(text="복사됨!"){
  if (!el.toast) return;
  el.toast.textContent = text;
  el.toast.classList.remove("hidden");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => el.toast.classList.add("hidden"), 1200);
}

function openModal(modalEl){ modalEl?.classList.remove("hidden"); }
function closeModal(modalEl){ modalEl?.classList.add("hidden"); }

function saveViewerGender(g){
  state.viewerGender = g;
  localStorage.setItem(LS_GENDER, g);
}
function loadViewerGender(){
  const g = localStorage.getItem(LS_GENDER);
  if (g === "M" || g === "F") state.viewerGender = g;
}

function setStatus(text, loading=false){
  const txt = el.statusText?.querySelector?.(".txt");
  if (txt) txt.textContent = text;
  else if (el.statusText) el.statusText.textContent = text;

  el.statusText?.classList.toggle("loading", !!loading);
}

function setApiChip(ok, hint=""){
  const c = el.chipApi;
  if (!c) return;
  c.classList.remove("ok","bad");
  if (ok === true){
    c.textContent = hint ? `API: ON · ${hint}` : `API: ON`;
    c.classList.add("ok");
  } else if (ok === false){
    c.textContent = hint ? `API: OFF · ${hint}` : `API: OFF`;
    c.classList.add("bad");
  } else {
    c.textContent = `API: -`;
  }
}

function setChips(){
  if (!el.chipViewer || !el.chipShowing) return;
  el.chipViewer.innerHTML  = `내 성별: <strong>${genderLabel(state.viewerGender)}</strong>`;
  el.chipShowing.innerHTML = `표시: <strong>${genderLabel(oppositeGender(state.viewerGender))}</strong>`;
}

// ===============================
// ✅ fetch 유틸 (타임아웃/재시도)
// ===============================
async function fetchWithTimeout(url, { timeoutMs=5000, ...opts } = {}){
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try{
    const res = await fetch(url, { ...opts, signal: ctrl.signal });
    return res;
  } finally {
    clearTimeout(t);
  }
}

async function fetchProfiles(viewerGender) {
  const g = toMF(viewerGender);
  if (!g) return { ok:false, profiles:[], reason:"viewer_gender invalid" };

  const url = `${API_BASE}/profiles?viewer_gender=${encodeURIComponent(g)}`;

  for (let attempt=1; attempt<=2; attempt++){
    let res;
    try{
      res = await fetchWithTimeout(url, { timeoutMs: 6500, method:"GET" });
    }catch(e){
      const msg = (e && e.name === "AbortError") ? "timeout" : "network";
      if (attempt === 2) return { ok:false, profiles:[], reason: msg };
      await sleep(350);
      continue;
    }

    let text = "";
    try { text = await res.text(); }
    catch { return { ok:false, profiles:[], reason:"read_failed" }; }

    let data;
    try { data = JSON.parse(text); }
    catch { return { ok:false, profiles:[], reason:"non_json" }; }

    if (!res.ok) return { ok:false, profiles:[], reason:`http_${res.status}` };
    if (!data || data.ok !== true || !Array.isArray(data.profiles)) return { ok:false, profiles:[], reason:"shape" };

    return { ok:true, profiles:data.profiles, reason:"ok" };
  }

  return { ok:false, profiles:[], reason:"unknown" };
}

// ===============================
// ✅ 렌더링/정렬/검색
// ===============================
function escapeHtml(s){
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function formatAssets(v){
  if (v === null || v === undefined || v === "") return "-";
  const n = Number(v);
  if (!Number.isNaN(n) && Number.isFinite(n)) return n.toLocaleString("ko-KR");
  return String(v);
}

function renderSkeleton(count=9){
  if (!el.grid) return;
  el.grid.innerHTML = "";
  el.empty?.classList.add("hidden");
  for(let i=0;i<count;i++){
    const s = document.createElement("div");
    s.className = "skel";
    el.grid.appendChild(s);
  }
}

function normalizeText(s){
  return (s ?? "").toString().trim().toLowerCase();
}

function applyQueryAndSort(){
  const q = normalizeText(el.q?.value);
  const sort = el.sort?.value;

  localStorage.setItem(LS_Q, el.q?.value ?? "");
  localStorage.setItem(LS_SORT, sort ?? "recent");

  let arr = state.profilesRaw.slice();

  if (q){
    arr = arr.filter(p => {
      const a = normalizeText(p.minecraft_name);
      const b = normalizeText(p.job);
      const c = normalizeText(p.bio);
      return a.includes(q) || b.includes(q) || c.includes(q);
    });
  }

  if (sort === "ageAsc"){
    arr.sort((x,y) => (Number(x.age)||999) - (Number(y.age)||999));
  } else if (sort === "ageDesc"){
    arr.sort((x,y) => (Number(y.age)||-1) - (Number(x.age)||-1));
  } else if (sort === "nameAsc"){
    arr.sort((x,y) => normalizeText(x.minecraft_name).localeCompare(normalizeText(y.minecraft_name)));
  } else {
    // 최신순: 가져온 순서 유지
  }

  state.profilesView = arr;
}

function render(){
  if (!el.grid) return;
  el.grid.innerHTML = "";
  el.empty?.classList.add("hidden");

  if (!state.profilesView.length){
    el.empty?.classList.remove("hidden");
    return;
  }

  let i = 0;
  for (const p of state.profilesView){
    const card = document.createElement("div");
    card.className = "card";
    card.style.animationDelay = `${Math.min(i * 28, 260)}ms`;
    i++;

    const name = escapeHtml(p.minecraft_name ?? "Unknown");
    const age  = escapeHtml(p.age ?? "-");
    const job  = escapeHtml(p.job ?? "-");
    const bio  = escapeHtml(p.bio ?? "");
    const code = escapeHtml(p.code ?? "--------");

    card.innerHTML = `
      <div class="name">${name}</div>
      <div class="meta">${age}세 · ${job}</div>
      <p class="bio">${bio || "한줄소개가 아직 없어요."}</p>
      <div class="badge">
        <span>프로필 코드 <code>${code}</code></span>
        <span class="mini">클릭</span>
      </div>
    `;

    card.addEventListener("mousemove", (e) => {
      const r = card.getBoundingClientRect();
      const mx = ((e.clientX - r.left) / r.width) * 100;
      const my = ((e.clientY - r.top) / r.height) * 100;
      card.style.setProperty("--mx", mx.toFixed(2) + "%");
      card.style.setProperty("--my", my.toFixed(2) + "%");
    });

    if (!state.reducedMotion){
      card.addEventListener("mouseenter", () => card.classList.add("tilt-on"));
      card.addEventListener("mouseleave", () => {
        card.style.transform = "";
        card.classList.remove("tilt-on");
      });
      card.addEventListener("mousemove", (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        const rx = (-py * 6).toFixed(2);
        const ry = (px * 8).toFixed(2);
        card.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg) translateY(-2px)`;
      });
    }

    card.addEventListener("click", () => openProfile(p));
    el.grid.appendChild(card);
  }
}

// ===============================
// ✅ 프로필 모달
// ===============================
async function copyText(text){
  try{
    await navigator.clipboard.writeText(text);
    return true;
  }catch{
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch {}
    document.body.removeChild(ta);
    return ok;
  }
}

async function openProfile(p){
  state.selected = p;

  el.pmName.textContent = p.minecraft_name ?? "-";
  el.pmMeta.textContent = `${p.age ?? "-"}세 · ${genderLabel(p.gender)} · 코드 자동복사`;
  el.pmJob.textContent = p.job ?? "-";
  el.pmAssets.textContent = formatAssets(p.assets);
  el.pmBio.textContent = p.bio ?? "-";
  el.pmCode.textContent = p.code ?? "--------";

  openModal(el.profileModal);

  if (p.code){
    const ok = await copyText(p.code);
    if (ok) showToast("코드 복사됨!");
  }
}

// ===============================
// ✅ 모달 닫기 + ESC
// ===============================
function wireModalBackdropClose(modal){
  const backdrop = modal?.querySelector?.(".modal-backdrop");
  backdrop?.addEventListener("click", () => closeModal(modal));
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal && !modal.classList.contains("hidden")) closeModal(modal);
  });
}

function openGenderPicker(force=false){
  if (!state.viewerGender || force) openModal(el.genderModal);
}

// ===============================
// ✅ 자동 새로고침
// ===============================
function setAutoRefresh(on){
  el.auto.checked = !!on;
  localStorage.setItem(LS_AUTO, on ? "1" : "0");

  if (state.autoTimer){
    clearInterval(state.autoTimer);
    state.autoTimer = null;
  }
  if (on){
    state.autoTimer = setInterval(() => load({ silent:true }), 30000);
  }
}

// ===============================
// ✅ 파티클/커서 FX
// ===============================
function initCursor(){
  if (!el.cursor) return;
  const isFine = window.matchMedia?.("(pointer:fine)")?.matches ?? true;
  if (!isFine) return;

  el.cursor.classList.toggle("on", true);

  window.addEventListener("mousemove", (e) => {
    state.mouse.x = e.clientX;
    state.mouse.y = e.clientY;
    state.mouse.alive = true;
    el.cursor.style.left = e.clientX + "px";
    el.cursor.style.top  = e.clientY + "px";
  }, { passive:true });

  window.addEventListener("mousedown", () => el.cursor.classList.add("click"));
  window.addEventListener("mouseup", () => el.cursor.classList.remove("click"));
}

function initParticles(){
  const c = el.fxCanvas;
  if (!c) return;

  const ctx = c.getContext("2d");
  if (!ctx) return;

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = Math.floor(window.innerWidth * dpr);
    c.height = Math.floor(window.innerHeight * dpr);
    c.style.width = window.innerWidth + "px";
    c.style.height = window.innerHeight + "px";
    ctx.setTransform(dpr,0,0,dpr,0,0);
  };
  resize();
  window.addEventListener("resize", resize);

  const N = state.reducedMotion ? 24 : 60;
  const parts = Array.from({length:N}, () => ({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    vx: (Math.random()*2-1) * 0.25,
    vy: (Math.random()*2-1) * 0.25,
    r: 1.2 + Math.random()*1.8,
    a: 0.25 + Math.random()*0.45,
    hue: 300 + Math.random()*70,
  }));

  function step(){
    ctx.clearRect(0,0,window.innerWidth,window.innerHeight);

    if (state.mouse.alive && !state.reducedMotion){
      const g = ctx.createRadialGradient(state.mouse.x, state.mouse.y, 0, state.mouse.x, state.mouse.y, 240);
      g.addColorStop(0, "rgba(255,77,166,0.10)");
      g.addColorStop(0.5, "rgba(120,102,255,0.06)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0,0,window.innerWidth,window.innerHeight);
    }

    for (const p of parts){
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < -20) p.x = window.innerWidth + 20;
      if (p.x > window.innerWidth + 20) p.x = -20;
      if (p.y < -20) p.y = window.innerHeight + 20;
      if (p.y > window.innerHeight + 20) p.y = -20;

      if (state.mouse.alive && !state.reducedMotion){
        const dx = state.mouse.x - p.x;
        const dy = state.mouse.y - p.y;
        const d2 = dx*dx + dy*dy;
        if (d2 < 240*240){
          p.vx += dx * 0.0000022;
          p.vy += dy * 0.0000022;
        }
      }

      p.vx *= 0.995;
      p.vy *= 0.995;

      ctx.beginPath();
      ctx.fillStyle = `hsla(${p.hue}, 90%, 75%, ${p.a})`;
      ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fill();
    }

    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ===============================
// ✅ 공유(가능하면 Web Share, 아니면 링크 복사)
// ===============================
async function sharePage(){
  const url = location.href;
  const title = document.title;
  const text = "도스 소개팅 — 프로필 코드를 복사해서 디스코드에서 신청하세요";

  try{
    if (navigator.share){
      await navigator.share({ title, text, url });
      showToast("공유 완료!");
      return;
    }
  }catch{}

  const ok = await copyText(url);
  showToast(ok ? "링크 복사됨!" : "복사 실패");
}

// ===============================
// ✅ 메인 로드
// ===============================
async function load({ silent=false } = {}){
  if (!state.viewerGender){
    openGenderPicker(true);
    return;
  }

  setChips();
  if (!silent){
    setStatus("불러오는 중…", true);
    renderSkeleton(9);
  } else {
    setStatus("갱신 중…", true);
  }

  const r = await fetchProfiles(state.viewerGender);

  if (!r.ok){
    state.lastFetchOk = false;
    setApiChip(false, r.reason === "network" ? "DNS/도메인 확인" :
                     r.reason === "timeout" ? "서버 지연" :
                     r.reason === "non_json" ? "서버에러" :
                     r.reason.startsWith("http_") ? r.reason.replace("http_","HTTP ") :
                     "오류");

    setStatus("API 연결 실패 — 도메인/DNS/포트/방화벽 확인", false);
    state.profilesRaw = [];
    state.profilesView = [];
    render();
    return;
  }

  state.lastFetchOk = true;
  setApiChip(true, "정상");

  state.profilesRaw = r.profiles || [];
  applyQueryAndSort();

  setStatus(`총 ${state.profilesView.length}명 표시중`, false);
  render();
}

// ===============================
// ✅ 이벤트 바인딩
// ===============================
function bindEvents(){
  el.btnRefresh.addEventListener("click", () => load());
  el.btnGender.addEventListener("click", () => openGenderPicker(true));
  el.btnShare.addEventListener("click", () => sharePage());

  el.btnCloseGender.addEventListener("click", () => closeModal(el.genderModal));
  el.genderModal.querySelectorAll("[data-gender]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const g = toMF(btn.getAttribute("data-gender"));
      if (!g) return;
      saveViewerGender(g);
      setChips();
      closeModal(el.genderModal);
      await load();
    });
  });

  el.btnCloseProfile.addEventListener("click", () => closeModal(el.profileModal));
  el.btnCopy.addEventListener("click", async () => {
    const code = state.selected?.code;
    if (!code) return;
    const ok = await copyText(code);
    showToast(ok ? "복사됨!" : "복사 실패");
  });

  el.q.addEventListener("input", () => {
    localStorage.setItem(LS_Q, el.q.value);
    applyQueryAndSort();
    setStatus(`총 ${state.profilesView.length}명 표시중`, false);
    render();
  });
  el.sort.addEventListener("change", () => {
    localStorage.setItem(LS_SORT, el.sort.value);
    applyQueryAndSort();
    setStatus(`총 ${state.profilesView.length}명 표시중`, false);
    render();
  });

  el.auto.addEventListener("change", () => setAutoRefresh(el.auto.checked));

  wireModalBackdropClose(el.genderModal);
  wireModalBackdropClose(el.profileModal);
}

function restoreUiPrefs(){
  const auto = localStorage.getItem(LS_AUTO) === "1";
  const sort = localStorage.getItem(LS_SORT) || "recent";
  const q = localStorage.getItem(LS_Q) || "";

  el.auto.checked = auto;
  el.sort.value = sort;
  el.q.value = q;

  setAutoRefresh(auto);
}

// ===============================
// ✅ helpers
// ===============================
function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

// ===============================
// ✅ init
// ===============================
(function init(){
  loadViewerGender();
  restoreUiPrefs();
  bindEvents();

  initCursor();
  initParticles();

  setupBgm(); // ✅ BGM 여기서 딱 1번 초기화

  setApiChip(null);
  openGenderPicker(false);
  load();
})();
