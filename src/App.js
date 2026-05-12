import { useState, useEffect, useCallback } from "react";

// ============================================================
//  KONFIGURASI — SUDAH DIISI DENGAN DATA ANDA
// ============================================================
const CONFIG = {
  SPREADSHEET_ID: "1kgXCwVqi3eaJzOTm0FZnvZ8OS7an7LX6MEMgSJRNcII",
  API_KEY: "AIzaSyCKcFwq0p5MPDCbTjHxtOY0JdRlsQSUV0k",
  SHEET_NAME: "Ringkasan Hari Ini",
  RANGE: "A6:E100",
};

// ============================================================
//  DATA DUMMY — dipakai saat API gagal
// ============================================================
const DUMMY_DATA = [
  { komoditas: "Bawang Merah Ukuran Sedang", harga: 34000, satuan: "kg",    pasar: "Pasar Baru"          },
  { komoditas: "Bawang Putih Ukuran Sedang", harga: 29000, satuan: "kg",    pasar: "Pasar Baru"          },
  { komoditas: "Cabai Merah Besar",          harga: 46000, satuan: "kg",    pasar: "Pasar Gotong Royong" },
  { komoditas: "Cabai Merah Keriting",       harga: 54000, satuan: "kg",    pasar: "Pasar Baru"          },
  { komoditas: "Cabai Rawit Merah",          harga: 70000, satuan: "kg",    pasar: "Pasar Wonoasih"      },
  { komoditas: "Cabai Rawit Hijau",          harga: 38000, satuan: "kg",    pasar: "Pasar Semampir"      },
  { komoditas: "Beras Kualitas Medium I",    harga: 13500, satuan: "kg",    pasar: "Pasar Baru"          },
  { komoditas: "Beras Kualitas Super I",     harga: 16000, satuan: "kg",    pasar: "Pasar Gotong Royong" },
  { komoditas: "Gula Pasir Lokal",           harga: 17500, satuan: "kg",    pasar: "Pasar Baru"          },
  { komoditas: "Minyak Goreng Curah",        harga: 15000, satuan: "liter", pasar: "Pasar Wonoasih"      },
  { komoditas: "Telur Ayam Ras Segar",       harga: 28500, satuan: "kg",    pasar: "Pasar Baru"          },
  { komoditas: "Daging Ayam Ras Segar",      harga: 36000, satuan: "kg",    pasar: "Pasar Gotong Royong" },
  { komoditas: "Daging Sapi Kualitas 1",     harga:135000, satuan: "kg",    pasar: "Pasar Baru"          },
];

const ICON_MAP = {
  "bawang merah": "🧅", "bawang putih": "🧄",
  "cabai": "🌶️", "tomat": "🍅", "kentang": "🥔",
  "wortel": "🥕", "beras": "🌾", "gula": "🍬",
  "minyak": "🫙", "telur": "🥚", "ayam": "🍗",
  "sapi": "🥩", "default": "🛒",
};

function getIcon(nama) {
  const lower = (nama || "").toLowerCase();
  for (const [key, icon] of Object.entries(ICON_MAP)) {
    if (lower.includes(key)) return icon;
  }
  return ICON_MAP.default;
}

function getKategori(nama) {
  const lower = (nama || "").toLowerCase();
  if (lower.includes("cabai"))  return "Cabai";
  if (lower.includes("bawang")) return "Bumbu";
  if (lower.includes("beras"))  return "Beras";
  if (lower.includes("gula") || lower.includes("minyak")) return "Sembako";
  if (lower.includes("telur") || lower.includes("ayam") || lower.includes("sapi")) return "Protein";
  return "Sayuran";
}

function enrich(arr) {
  return arr.map(d => ({ ...d, icon: getIcon(d.komoditas), kategori: getKategori(d.komoditas) }));
}

// ============================================================
//  KOMPONEN UTAMA
// ============================================================
export default function App() {
  const [data, setData]             = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [lastUpdate, setLastUpdate] = useState("");
  const [search, setSearch]         = useState("");
  const [filterKat, setFilterKat]   = useState("Semua");
  const [selected, setSelected]     = useState(null);
  const [isDummy, setIsDummy]       = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SPREADSHEET_ID}/values/${encodeURIComponent(CONFIG.SHEET_NAME + "!" + CONFIG.RANGE)}?key=${CONFIG.API_KEY}`;
      const res  = await fetch(url);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.error?.message || "Gagal mengambil data");
      }
      const json = await res.json();
      const rows = (json.values || []).filter(r => r.length >= 3 && r[1] && r[2]);
      if (rows.length === 0) throw new Error("Sheet kosong atau belum ada data");

      const parsed = rows.map(r => ({
        komoditas: r[1] || "",
        harga    : parseInt(String(r[2]).replace(/[^0-9]/g, "")) || 0,
        satuan   : r[3] || "kg",
        pasar    : r[4] || "-",
      }));

      setData(enrich(parsed));
      setIsDummy(false);
    } catch (e) {
      setError(e.message);
      setData(enrich(DUMMY_DATA));
      setIsDummy(true);
    } finally {
      setLastUpdate(new Date().toLocaleString("id-ID", {
        weekday: "long", year: "numeric", month: "long",
        day: "numeric", hour: "2-digit", minute: "2-digit",
      }) + " WIB");
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const kategoriList = ["Semua", ...new Set(data.map(d => d.kategori))];
  const filtered = data.filter(d =>
    (filterKat === "Semua" || d.kategori === filterKat) &&
    d.komoditas.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ fontFamily: "'Sora', sans-serif", minHeight: "100vh", background: "#0c0f0a", color: "#f0f0f0" }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: #22c55e44; border-radius: 4px; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes spin   { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .card { animation: fadeUp .3s ease both; transition: transform .18s, box-shadow .18s; cursor: pointer; }
        .card:hover { transform: translateY(-3px); box-shadow: 0 8px 24px #00000066; }
        .overlay { position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:200;display:flex;align-items:center;justify-content:center;padding:16px; }
        .modal { background:#131a10;border-radius:20px;padding:28px;max-width:460px;width:100%;border:1px solid #1e3a1e; }
        .tag { border-radius:20px;padding:5px 14px;font-size:12px;font-weight:600;cursor:pointer;border:none;font-family:inherit;transition:all .15s;white-space:nowrap; }
        input:focus { outline:none; border-color:#22c55e !important; }
        button { font-family: inherit; }
      `}</style>

      {/* HEADER */}
      <div style={{ background:"linear-gradient(160deg,#0a1f0a,#0c0f0a 70%)", borderBottom:"1px solid #1a2e1a", padding:"18px 20px 0" }}>
        <div style={{ maxWidth:700, margin:"0 auto" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:44, height:44, background:"linear-gradient(135deg,#22c55e,#15803d)", borderRadius:14, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>🌿</div>
            <div>
              <div style={{ fontSize:20, fontWeight:800, letterSpacing:-0.5 }}>PasarKu Probolinggo</div>
              <div style={{ fontSize:10, color:"#4ade80", fontWeight:600, letterSpacing:1.5 }}>MONITOR HARGA PANGAN HARIAN • REAL TIME</div>
            </div>
            <button onClick={fetchData} style={{ marginLeft:"auto", background:"#0f2a0f", border:"1px solid #22c55e44", color:"#4ade80", borderRadius:10, padding:"8px 14px", fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
              <span style={{ display:"inline-block", animation: loading ? "spin 1s linear infinite" : "none", fontSize:15 }}>↻</span> Refresh
            </button>
          </div>

          {/* Status banner */}
          {isDummy ? (
            <div style={{ margin:"12px 0 0", background:"#2a1a00", border:"1px solid #f59e0b44", borderRadius:10, padding:"8px 14px", fontSize:11, color:"#fbbf24", display:"flex", gap:8 }}>
              <span>⚠️</span><span>Mode demo — {error || "API Key belum terhubung"}</span>
            </div>
          ) : !loading && (
            <div style={{ margin:"10px 0 0", background:"#0a2a0f", border:"1px solid #22c55e44", borderRadius:10, padding:"7px 14px", fontSize:11, color:"#4ade80", display:"flex", gap:8 }}>
              <span>✅</span><span>Terhubung ke Google Sheets — data real time aktif</span>
            </div>
          )}

          {/* Stat chips */}
          <div style={{ display:"flex", gap:10, padding:"14px 0 0", overflowX:"auto" }}>
            {[
              { l:"Total Komoditas", v: data.length,  c:"#60a5fa", bg:"#0f1f35" },
              { l:"Wilayah",        v:"Kab. Probolinggo", c:"#4ade80", bg:"#0a2010" },
              { l:"Sumber",         v:"PIHPS BI",     c:"#fbbf24", bg:"#231a00" },
              { l:"Jenis Pasar",    v:"Tradisional",  c:"#c084fc", bg:"#1a0a2e" },
            ].map((s, i) => (
              <div key={i} style={{ background:s.bg, borderRadius:10, padding:"8px 14px", minWidth:110, flexShrink:0, border:`1px solid ${s.c}22` }}>
                <div style={{ fontSize:14, fontWeight:800, color:s.c }}>{s.v}</div>
                <div style={{ fontSize:10, color:"#6b7280" }}>{s.l}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize:10, color:"#374151", padding:"8px 0 2px" }}>📅 {lastUpdate || "Memuat..."}</div>
        </div>
      </div>

      {/* KONTEN */}
      <div style={{ maxWidth:700, margin:"0 auto", padding:"16px 20px 40px" }}>

        {/* Search */}
        <div style={{ position:"relative", marginBottom:12 }}>
          <span style={{ position:"absolute", left:13, top:"50%", transform:"translateY(-50%)" }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari komoditas..."
            style={{ width:"100%", background:"#131a10", border:"1px solid #1e3a1e", borderRadius:12, padding:"11px 14px 11px 40px", color:"#f0f0f0", fontSize:14, fontFamily:"inherit" }} />
        </div>

        {/* Filter kategori */}
        <div style={{ display:"flex", gap:7, overflowX:"auto", paddingBottom:4, marginBottom:16 }}>
          {kategoriList.map(k => (
            <button key={k} className="tag" onClick={() => setFilterKat(k)}
              style={{ background: filterKat===k ? "#16a34a" : "#131a10", color: filterKat===k ? "#fff" : "#6b7280", border:`1px solid ${filterKat===k ? "#16a34a" : "#1e3a1e"}` }}>
              {k}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign:"center", padding:"70px 0" }}>
            <div style={{ fontSize:40, animation:"pulse 1.2s ease infinite" }}>🌿</div>
            <div style={{ marginTop:12, fontSize:13, color:"#4b5563" }}>Memuat data dari Google Sheets...</div>
          </div>
        )}

        {/* Grid kartu */}
        {!loading && (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(290px, 1fr))", gap:11 }}>
            {filtered.map((item, i) => (
              <div key={i} className="card" onClick={() => setSelected(item)}
                style={{ animationDelay:`${i*0.035}s`, background:"#131a10", border:"1px solid #1e3a1e", borderRadius:15, padding:16,
                  borderLeft:"3px solid #374151" }}>
                <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
                  <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                    <span style={{ fontSize:28 }}>{item.icon}</span>
                    <div>
                      <div style={{ fontWeight:700, fontSize:13, lineHeight:1.3 }}>{item.komoditas}</div>
                      <div style={{ fontSize:10, color:"#4b5563", marginTop:2 }}>{item.kategori} • per {item.satuan}</div>
                    </div>
                  </div>
                  <div style={{ textAlign:"right", flexShrink:0, marginLeft:8 }}>
                    <div style={{ fontSize:15, fontWeight:800 }}>Rp {item.harga.toLocaleString("id-ID")}</div>
                    <div style={{ fontSize:10, marginTop:3, padding:"2px 7px", borderRadius:6, display:"inline-block", color:"#4ade80", background:"#0a2010" }}>
                      ● Live
                    </div>
                  </div>
                </div>
                <div style={{ marginTop:10, fontSize:10, color:"#374151", borderTop:"1px solid #1e3a1e", paddingTop:8, display:"flex", justifyContent:"space-between" }}>
                  <span>🏬 {item.pasar}</span>
                  <span style={{ color:"#22c55e" }}>Detail →</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div style={{ textAlign:"center", padding:"60px 0", color:"#374151" }}>
            <div style={{ fontSize:36 }}>🔍</div>
            <div style={{ marginTop:8, fontSize:14 }}>Komoditas tidak ditemukan</div>
          </div>
        )}

        <div style={{ textAlign:"center", marginTop:24, fontSize:10, color:"#1f2f1f" }}>
          Sumber: PIHPS Nasional • Bank Indonesia • Kab. Probolinggo, Jawa Timur
        </div>
      </div>

      {/* MODAL DETAIL */}
      {selected && (
        <div className="overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
              <span style={{ fontSize:38 }}>{selected.icon}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:800, fontSize:17 }}>{selected.komoditas}</div>
                <div style={{ fontSize:11, color:"#4b5563" }}>{selected.kategori} • per {selected.satuan}</div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background:"#1e3a1e", border:"none", color:"#6b7280", borderRadius:8, width:32, height:32, cursor:"pointer", fontSize:16, flexShrink:0 }}>✕</button>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:20 }}>
              {[
                { l:"Harga Hari Ini", v:`Rp ${selected.harga.toLocaleString("id-ID")}`, c:"#fff"     },
                { l:"Satuan",         v:selected.satuan,                                 c:"#9ca3af"  },
                { l:"Pasar",          v:selected.pasar,                                  c:"#60a5fa"  },
                { l:"Sumber Data",    v:"PIHPS BI",                                      c:"#fbbf24"  },
              ].map((s, i) => (
                <div key={i} style={{ background:"#0c0f0a", borderRadius:10, padding:"12px 14px", border:"1px solid #1e3a1e" }}>
                  <div style={{ fontSize:10, color:"#4b5563", marginBottom:4 }}>{s.l}</div>
                  <div style={{ fontWeight:700, color:s.c, fontSize:14 }}>{s.v}</div>
                </div>
              ))}
            </div>
            <div style={{ background:"#0c150c", borderRadius:10, padding:"12px 14px", border:"1px solid #1e3a1e", fontSize:11, color:"#4b5563", lineHeight:1.8 }}>
              📍 Wilayah: Kab. Probolinggo, Jawa Timur<br />
              📊 Jenis Pasar: Pasar Tradisional<br />
              🕐 Update: Setiap hari kerja input manual<br />
              🔗 Data via: Google Sheets API
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
