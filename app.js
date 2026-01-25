// app.js
// ✅ 봇 API를 주기적으로 폴링해서 데이터만 갱신 (페이지 전체 새로고침 X)

const API_BASE = "http://115.23.154.100:41035"; // ← 네 봇이 돌아가는 서버 주소로 변경
const ENDPOINT = `${API_BASE}/api/market/snapshot`;

const $ = (q) => document.querySelector(q);
const listEl = $("#stockList");

let state = {
  selected: null,
  cache: [],
  lastTs: 0
};

function fmt(n){
  if (n === null || n === undefined) return "—";
  return Number(n).toLocaleString("ko-KR");
}

function riskLabel(baseRisk, price, floor){
  if (!price || price <= 0) return "—";
  const drop = 1 - (floor / price);
  // drop이 클수록 위험
  if (drop >= 0.55 || baseRisk >= 0.50) return "위험도: 매우 높음";
  if (drop >= 0.40 || baseRisk >= 0.40) return "위험도: 높음";
  if (drop >= 0.25 || baseRisk >= 0.30) return "위험도: 보통";
  return "위험도: 낮음";
}

function setPill(ok){
  $("#pillState").textContent = ok ? "LIVE" : "OFFLINE";
  $("#pillState").style.borderColor = ok ? "rgba(46,204,113,.35)" : "rgba(255,77,79,.35)";
}

function setLastUpdate(ts){
  const d = new Date(ts * 1000);
  $("#lastUpdate").textContent = `Last: ${d.toLocaleString("ko-KR")}`;
}

function renderList(symbols){
  listEl.innerHTML = "";
  symbols.forEach(s=>{
    const div = document.createElement("div");
    div.className = "item";
    div.dataset.sym = s.symbol;

    const badge = document.createElement("div");
    badge.className = "badge" + (s.active ? "" : " inactive");

    const main = document.createElement("div");
    main.className = "item-main";

    const top = document.createElement("div");
    top.className = "item-top";
    top.innerHTML = `<div class="sym">${s.symbol}</div><div class="price">${fmt(s.price)}</div>`;

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.innerHTML = `<div>${s.sector} · ${s.name}</div><div>하한 ${fmt(s.rel_floor)}</div>`;

    main.appendChild(top);
    main.appendChild(meta);

    div.appendChild(badge);
    div.appendChild(main);

    div.addEventListener("click", ()=>{
      state.selected = s.symbol;
      renderDetail(s);
    });

    listEl.appendChild(div);
  });
}

function renderDetail(s){
  $("#symTitle").textContent = `${s.symbol} · ${s.name}`;
  $("#symHint").textContent = `${s.sector} · 사유: ${s.reason || "—"}`;

  $("#vPrice").textContent = fmt(s.price);
  $("#vFloor").textContent = fmt(s.rel_floor);

  $("#vSector").textContent = `절대 하한(내부): ${fmt(s.abs_floor)} · baseRisk ${s.base_risk.toFixed(2)}`;
  $("#vRisk").textContent = riskLabel(s.base_risk, s.price, s.rel_floor);

  $("#vActive").textContent = s.active ? "ACTIVE(거래 가능)" : "INACTIVE(거래 불가)";
  $("#vReason").textContent = s.reason || "—";
}

async function fetchSnapshot(){
  try{
    const r = await fetch(ENDPOINT, { cache: "no-store" });
    if(!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = await r.json();

    setPill(true);
    setLastUpdate(data.ts);

    state.cache = data.symbols || [];
    renderList(state.cache);

    // 선택된 종목 유지
    if(state.selected){
      const found = state.cache.find(x => x.symbol === state.selected);
      if(found) renderDetail(found);
    } else if(state.cache.length){
      state.selected = state.cache[0].symbol;
      renderDetail(state.cache[0]);
    }
  }catch(e){
    setPill(false);
  }
}

// 최초 로드 + 주기 갱신
fetchSnapshot();
setInterval(fetchSnapshot, 7000);

