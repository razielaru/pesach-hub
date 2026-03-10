<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>מבצע פסח תשפ"ו — רבנות פיקוד מרכז</title>
<link href="https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
:root {
  --bg0: #08090e;
  --bg1: #0f1117;
  --bg2: #161922;
  --bg3: #1e222e;
  --bg4: #252a38;
  --border: #2a2f42;
  --border2: #363c55;
  --gold: #d4a520;
  --gold2: #f0c040;
  --goldbg: rgba(212,165,32,.1);
  --goldbg2: rgba(212,165,32,.18);
  --text: #e0e4f0;
  --text2: #9aa0be;
  --text3: #5a6080;
  --green: #2ed47a;
  --greenbg: rgba(46,212,122,.1);
  --red: #f04a4a;
  --redbg: rgba(240,74,74,.1);
  --orange: #f0960a;
  --orangebg: rgba(240,150,10,.1);
  --blue: #4a90f0;
  --bluebg: rgba(74,144,240,.1);
  --purple: #9b6be8;
  --purplebg: rgba(155,107,232,.1);
  --r: 10px;
  --r-sm: 7px;
}

* { margin:0; padding:0; box-sizing:border-box; }
body {
  background: var(--bg0);
  color: var(--text);
  font-family: 'Heebo', sans-serif;
  direction: rtl;
  min-height: 100vh;
}

/* ── LOGIN SCREEN ── */
#login-screen {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: radial-gradient(ellipse at 50% 40%, #1a1f35 0%, var(--bg0) 70%);
  padding: 24px;
}
.login-logo {
  width: 72px; height: 72px;
  background: linear-gradient(135deg, var(--gold2) 0%, #8a6010 100%);
  border-radius: 18px;
  display: flex; align-items: center; justify-content: center;
  font-size: 36px;
  margin-bottom: 20px;
  box-shadow: 0 8px 32px rgba(212,165,32,.25);
}
.login-title { font-size: 28px; font-weight: 900; color: var(--text); margin-bottom: 6px; }
.login-sub { font-size: 14px; color: var(--text2); margin-bottom: 40px; }
.units-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  max-width: 900px;
  width: 100%;
}
.unit-login-card.senior {
  border-color: rgba(155,107,232,.5);
  background: rgba(155,107,232,.08);
}
.unit-login-card.senior::before { background: var(--purple); }
.unit-login-card {
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: var(--r);
  padding: 22px 16px;
  text-align: center;
  cursor: pointer;
  transition: all .18s;
  position: relative;
  overflow: hidden;
}
.unit-login-card::before {
  content: '';
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 3px;
  background: var(--border2);
  transition: background .18s;
}
.unit-login-card:hover { border-color: var(--gold); transform: translateY(-3px); box-shadow: 0 12px 30px rgba(0,0,0,.4); }
.unit-login-card:hover::before { background: var(--gold); }
.unit-login-card.admin { border-color: var(--gold); background: var(--goldbg); }
.unit-login-card.admin::before { background: var(--gold2); }
.ulc-icon { font-size: 28px; margin-bottom: 10px; }
.ulc-name { font-size: 15px; font-weight: 800; }
.ulc-type { font-size: 11px; color: var(--text3); margin-top: 4px; }

/* ── APP LAYOUT ── */
#app { display: none; }
.topbar {
  height: 54px;
  background: var(--bg1);
  border-bottom: 1px solid var(--border);
  display: flex; align-items: center;
  padding: 0 20px;
  gap: 12px;
  position: sticky; top: 0; z-index: 60;
}
.tb-logo { font-size: 11px; color: var(--text2); display: flex; align-items: center; gap: 8px; }
.tb-logo span { font-size: 18px; }
.tb-unit-badge {
  background: var(--goldbg2);
  border: 1px solid var(--gold);
  color: var(--gold);
  padding: 4px 12px; border-radius: 20px;
  font-size: 12px; font-weight: 700;
}
.tb-nav { display: flex; gap: 2px; margin: 0 auto; }
.tb-nav-btn {
  background: transparent; border: none;
  color: var(--text2);
  padding: 6px 14px; border-radius: 6px;
  cursor: pointer; font-family: 'Heebo', sans-serif;
  font-size: 13px; font-weight: 600;
  transition: all .15s;
  display: flex; align-items: center; gap: 6px;
}
.tb-nav-btn:hover { background: var(--bg3); color: var(--text); }
.tb-nav-btn.active { background: var(--goldbg2); color: var(--gold); }
.tb-right { display: flex; align-items: center; gap: 10px; }
.countdown-chip {
  background: var(--bg3);
  border: 1px solid var(--border2);
  border-radius: 20px;
  padding: 4px 12px;
  font-size: 11px; font-weight: 700;
  color: var(--gold2);
  display: flex; align-items: center; gap: 5px;
}
.clock-chip {
  font-size: 12px; color: var(--text3);
  font-variant-numeric: tabular-nums;
}
.back-btn {
  background: transparent; border: 1px solid var(--border2);
  color: var(--text2); padding: 5px 12px; border-radius: 6px;
  cursor: pointer; font-family: 'Heebo', sans-serif;
  font-size: 12px; font-weight: 600;
  transition: all .15s;
}
.back-btn:hover { border-color: var(--gold); color: var(--gold); }

/* ── PAGES ── */
.page { display: none; padding: 22px 24px; max-width: 1400px; margin: 0 auto; }
.page.active { display: block; }

/* ── KPI ROW ── */
.kpi-row { display: grid; gap: 14px; margin-bottom: 20px; }
.kpi-row.cols-5 { grid-template-columns: repeat(5,1fr); }
.kpi-row.cols-4 { grid-template-columns: repeat(4,1fr); }
.kpi-row.cols-3 { grid-template-columns: repeat(3,1fr); }
.kpi {
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: var(--r);
  padding: 18px;
  position: relative; overflow: hidden;
}
.kpi::before {
  content: '';
  position: absolute; top: 0; right: 0;
  width: 4px; height: 100%;
  border-radius: 0 var(--r) var(--r) 0;
}
.kpi.gold::before { background: var(--gold); }
.kpi.green::before { background: var(--green); }
.kpi.red::before { background: var(--red); }
.kpi.blue::before { background: var(--blue); }
.kpi.orange::before { background: var(--orange); }
.kpi.purple::before { background: var(--purple); }
.kpi-lbl { font-size: 11px; font-weight: 700; color: var(--text3); text-transform: uppercase; letter-spacing: .6px; margin-bottom: 10px; }
.kpi-val { font-size: 34px; font-weight: 900; line-height: 1; }
.kpi-val.gold { color: var(--gold); }
.kpi-val.green { color: var(--green); }
.kpi-val.red { color: var(--red); }
.kpi-val.blue { color: var(--blue); }
.kpi-val.orange { color: var(--orange); }
.kpi-val.purple { color: var(--purple); }
.kpi-sub { font-size: 12px; color: var(--text3); margin-top: 5px; }

/* ── PANEL ── */
.panel {
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: var(--r);
  margin-bottom: 18px;
  overflow: hidden;
}
.panel-head {
  padding: 13px 18px;
  background: var(--bg3);
  border-bottom: 1px solid var(--border);
  display: flex; align-items: center; justify-content: space-between;
  gap: 10px;
}
.panel-title { font-size: 13px; font-weight: 800; color: var(--gold); }
.panel-body { padding: 16px 18px; }

/* ── BUTTONS ── */
.btn {
  background: var(--goldbg2);
  border: 1px solid rgba(212,165,32,.4);
  color: var(--gold);
  padding: 7px 16px;
  border-radius: var(--r-sm);
  cursor: pointer; font-family: 'Heebo', sans-serif;
  font-size: 12px; font-weight: 700;
  transition: all .15s; white-space: nowrap;
  display: inline-flex; align-items: center; gap: 5px;
}
.btn:hover { background: var(--gold); color: #000; }
.btn.sm { padding: 4px 10px; font-size: 11px; }
.btn.xs { padding: 2px 8px; font-size: 11px; border-radius: 5px; }
.btn.green { background: var(--greenbg); border-color: rgba(46,212,122,.4); color: var(--green); }
.btn.green:hover { background: var(--green); color: #000; }
.btn.red { background: var(--redbg); border-color: rgba(240,74,74,.4); color: var(--red); }
.btn.red:hover { background: var(--red); color: #fff; }
.btn.blue { background: var(--bluebg); border-color: rgba(74,144,240,.4); color: var(--blue); }
.btn.blue:hover { background: var(--blue); color: #fff; }
.btn.orange { background: var(--orangebg); border-color: rgba(240,150,10,.4); color: var(--orange); }
.btn.orange:hover { background: var(--orange); color: #000; }
.btn.ghost { background: transparent; border-color: var(--border2); color: var(--text2); }
.btn.ghost:hover { border-color: var(--text); color: var(--text); }

/* ── TABLE ── */
.tbl-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; }
th {
  padding: 10px 14px; text-align: right;
  font-size: 11px; font-weight: 700; color: var(--text3);
  text-transform: uppercase; letter-spacing: .4px;
  border-bottom: 1px solid var(--border);
  background: rgba(255,255,255,.015);
  white-space: nowrap;
}
td {
  padding: 11px 14px; font-size: 13px;
  border-bottom: 1px solid rgba(42,47,66,.6);
  vertical-align: middle;
}
tr:last-child td { border-bottom: none; }
tr:hover td { background: rgba(255,255,255,.018); }

/* ── BADGE ── */
.badge {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 3px 9px; border-radius: 20px;
  font-size: 11px; font-weight: 700; white-space: nowrap;
}
.badge.green { background: var(--greenbg); color: var(--green); border: 1px solid rgba(46,212,122,.25); }
.badge.red { background: var(--redbg); color: var(--red); border: 1px solid rgba(240,74,74,.25); }
.badge.orange { background: var(--orangebg); color: var(--orange); border: 1px solid rgba(240,150,10,.25); }
.badge.gold { background: var(--goldbg); color: var(--gold); border: 1px solid rgba(212,165,32,.25); }
.badge.blue { background: var(--bluebg); color: var(--blue); border: 1px solid rgba(74,144,240,.25); }
.badge.purple { background: var(--purplebg); color: var(--purple); border: 1px solid rgba(155,107,232,.25); }
.badge.dim { background: var(--bg3); color: var(--text3); border: 1px solid var(--border); }

/* ── PROGRESS ── */
.pbar { height: 6px; background: var(--border); border-radius: 3px; overflow: hidden; }
.pbar-fill { height: 100%; border-radius: 3px; transition: width .5s ease; }

/* ── PERSONNEL STATUS ── */
.ps-grid {
  display: grid;
  grid-template-columns: repeat(4,1fr);
  gap: 3px;
  font-size: 11px;
  font-weight: 700;
}
.ps-item {
  text-align: center;
  padding: 3px 4px;
  border-radius: 4px;
}

/* ── TASK CARD ── */
.task-card {
  background: var(--bg3);
  border: 1px solid var(--border);
  border-radius: var(--r);
  padding: 14px 16px;
  margin-bottom: 10px;
  transition: border-color .15s;
}
.task-card:hover { border-color: var(--border2); }
.task-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.task-title { font-size: 14px; font-weight: 700; }
.task-meta { font-size: 12px; color: var(--text3); margin-bottom: 10px; }
.task-units { display: flex; flex-wrap: wrap; gap: 5px; }
.task-unit-chip {
  background: var(--bg4);
  border: 1px solid var(--border2);
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 11px; font-weight: 600; color: var(--text2);
  cursor: pointer; transition: all .15s;
}
.task-unit-chip:hover { border-color: var(--green); color: var(--green); }
.task-unit-chip.done { background: var(--greenbg); border-color: rgba(46,212,122,.3); color: var(--green); }
.task-unit-chip.doing { background: var(--orangebg); border-color: rgba(240,150,10,.3); color: var(--orange); }

/* ── CLEANING GRID ── */
.clean-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px,1fr));
  gap: 10px;
}
.clean-card {
  background: var(--bg3);
  border: 1px solid var(--border);
  border-radius: var(--r);
  padding: 14px;
  cursor: pointer;
  transition: all .15s;
  text-align: center;
}
.clean-card:hover { transform: translateY(-2px); }
.clean-card.clean { border-color: rgba(46,212,122,.4); background: var(--greenbg); }
.clean-card.partial { border-color: rgba(240,150,10,.4); background: var(--orangebg); }
.clean-card.dirty { border-color: rgba(240,74,74,.3); }
.clean-icon { font-size: 28px; margin-bottom: 6px; }
.clean-name { font-size: 13px; font-weight: 700; margin-bottom: 4px; }
.clean-unit { font-size: 11px; color: var(--text3); }

/* ── MODAL ── */
.overlay {
  display: none; position: fixed; inset: 0;
  background: rgba(0,0,0,.8); z-index: 100;
  align-items: center; justify-content: center;
}
.overlay.open { display: flex; }
.modal {
  background: var(--bg2);
  border: 1px solid var(--gold);
  border-radius: 12px;
  padding: 26px;
  width: 500px; max-width: 95vw;
  max-height: 85vh; overflow-y: auto;
  animation: pop .18s ease;
  box-shadow: 0 20px 60px rgba(0,0,0,.5);
}
@keyframes pop { from { transform: scale(.94); opacity: 0; } to { transform: scale(1); opacity: 1; } }
.modal-title { font-size: 18px; font-weight: 900; color: var(--gold); margin-bottom: 20px; }
.form-row { margin-bottom: 14px; }
.form-label { display: block; font-size: 11px; font-weight: 700; color: var(--text3); margin-bottom: 5px; text-transform: uppercase; letter-spacing: .4px; }
.form-input {
  width: 100%;
  background: var(--bg3); border: 1px solid var(--border2);
  color: var(--text); padding: 9px 12px; border-radius: var(--r-sm);
  font-family: 'Heebo', sans-serif; font-size: 13px; direction: rtl;
  transition: border-color .15s;
}
.form-input:focus { outline: none; border-color: var(--gold); }
select.form-input option { background: var(--bg3); }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.modal-btns { display: flex; gap: 10px; margin-top: 20px; justify-content: flex-end; }

/* ── TOAST ── */
.toast {
  position: fixed; bottom: 20px; left: 50%;
  transform: translateX(-50%) translateY(80px);
  background: var(--bg3); border: 1px solid var(--border2);
  border-radius: 8px; padding: 10px 20px;
  font-size: 13px; font-weight: 700;
  transition: transform .3s ease; z-index: 200;
  pointer-events: none;
}
.toast.show { transform: translateX(-50%) translateY(0); }
.toast.green { border-color: var(--green); color: var(--green); }
.toast.gold { border-color: var(--gold); color: var(--gold); }
.toast.red { border-color: var(--red); color: var(--red); }

/* ── HERO BANNER ── */
.hero-banner {
  background: linear-gradient(135deg, #1a2040 0%, #0f1220 100%);
  border: 1px solid var(--border);
  border-radius: var(--r);
  padding: 22px 24px;
  margin-bottom: 20px;
  display: flex; align-items: center; justify-content: space-between;
  gap: 20px;
}
.hero-title { font-size: 22px; font-weight: 900; margin-bottom: 4px; }
.hero-sub { font-size: 13px; color: var(--text2); }
.hero-countdown {
  text-align: center; flex-shrink: 0;
}
.countdown-big { font-size: 56px; font-weight: 900; color: var(--gold2); line-height: 1; font-variant-numeric: tabular-nums; }
.countdown-lbl { font-size: 12px; color: var(--text3); margin-top: 4px; }

/* ── SEARCH ── */
.search {
  background: var(--bg3); border: 1px solid var(--border2);
  color: var(--text); padding: 7px 12px; border-radius: var(--r-sm);
  font-family: 'Heebo', sans-serif; font-size: 13px; direction: rtl;
  width: 200px;
}
.search:focus { outline: none; border-color: var(--gold); }

/* ── FILTER TABS ── */
.filter-tabs { display: flex; gap: 6px; flex-wrap: wrap; }
.ftab {
  background: transparent; border: 1px solid var(--border);
  color: var(--text3); padding: 5px 14px; border-radius: 20px;
  cursor: pointer; font-family: 'Heebo', sans-serif;
  font-size: 12px; font-weight: 700; transition: all .15s;
}
.ftab:hover { border-color: var(--border2); color: var(--text); }
.ftab.active { background: var(--gold); border-color: var(--gold); color: #000; }

/* ── PERSONNEL CARD ── */
.person-card {
  background: var(--bg3);
  border: 1px solid var(--border);
  border-radius: var(--r);
  padding: 14px;
  display: flex; align-items: center; gap: 14px;
  margin-bottom: 8px;
  transition: border-color .15s;
}
.person-card:hover { border-color: var(--border2); }
.person-avatar {
  width: 40px; height: 40px;
  background: var(--bg4);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 18px; flex-shrink: 0;
}
.person-name { font-size: 14px; font-weight: 700; }
.person-role { font-size: 12px; color: var(--text2); margin-top: 2px; }
.person-actions { margin-right: auto; display: flex; gap: 5px; flex-wrap: wrap; }

/* ── STATUS PILL ── */
.status-pill {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 5px 12px; border-radius: 20px;
  font-size: 12px; font-weight: 700;
  cursor: pointer; transition: all .15s;
  border: 1px solid transparent;
}
.status-pill.zoom { background: var(--bluebg); color: var(--blue); border-color: rgba(74,144,240,.3); }
.status-pill.available { background: var(--greenbg); color: var(--green); border-color: rgba(46,212,122,.3); }
.status-pill.away { background: var(--orangebg); color: var(--orange); border-color: rgba(240,150,10,.3); }
.status-pill.leave { background: var(--redbg); color: var(--red); border-color: rgba(240,74,74,.3); }

/* ── LOG ── */
.log-item {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 18px;
  border-bottom: 1px solid rgba(42,47,66,.4);
  font-size: 13px;
}
.log-item:last-child { border-bottom: none; }
.log-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }

/* ── BEINASH / TRAINING TABLE ── */
.training-row-status {
  display: flex; align-items: center; gap: 6px;
}
.tr-dot { width: 9px; height: 9px; border-radius: 50; flex-shrink: 0; }
.tr-dot.done { background: var(--green); border-radius: 50%; }
.tr-dot.active { background: var(--orange); border-radius: 50%; animation: blink 1.3s infinite; }
.tr-dot.none { background: var(--border2); border-radius: 50%; }
@keyframes blink { 0%,100%{opacity:1;}50%{opacity:.3;} }

/* ── BIG PROGRESS ── */
.big-prog {
  background: var(--bg3); border-radius: var(--r);
  padding: 20px; margin-bottom: 16px;
  display: flex; align-items: center; gap: 24px;
}
.big-num { font-size: 56px; font-weight: 900; color: var(--green); line-height: 1; }
.big-info { flex: 1; }
.big-info h3 { font-size: 16px; font-weight: 700; margin-bottom: 8px; }
.big-bar { height: 12px; background: var(--border); border-radius: 6px; overflow: hidden; }
.big-bar-fill { height: 100%; background: linear-gradient(90deg, var(--green), #1a9955); border-radius: 6px; transition: width .6s ease; }
.big-sub { font-size: 12px; color: var(--text3); margin-top: 6px; }

/* ── PIN MODAL ── */
#pin-screen {
  display: none; position: fixed; inset: 0;
  background: rgba(0,0,0,.85); z-index: 150;
  align-items: center; justify-content: center;
}
#pin-screen.open { display: flex; }
.pin-box {
  background: var(--bg2);
  border: 1px solid var(--gold);
  border-radius: 14px;
  padding: 32px;
  width: 340px;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0,0,0,.6);
  animation: pop .18s ease;
}
.pin-unit-name { font-size: 20px; font-weight: 900; color: var(--gold); margin-bottom: 6px; }
.pin-subtitle { font-size: 13px; color: var(--text3); margin-bottom: 20px; }
.pin-dots {
  display: flex; justify-content: center; gap: 10px;
  margin-bottom: 20px;
}
.pin-dot {
  width: 14px; height: 14px;
  border-radius: 50%;
  background: var(--border2);
  transition: background .15s;
}
.pin-dot.filled { background: var(--gold); }
.pin-pad {
  display: grid; grid-template-columns: repeat(3, 1fr);
  gap: 8px; margin-bottom: 14px;
}
.pin-key {
  background: var(--bg3); border: 1px solid var(--border2);
  color: var(--text); border-radius: 8px;
  padding: 14px; font-size: 18px; font-weight: 700;
  cursor: pointer; font-family: 'Heebo', sans-serif;
  transition: all .12s;
}
.pin-key:hover { background: var(--bg4); border-color: var(--gold); color: var(--gold); }
.pin-key.del { color: var(--red); border-color: rgba(240,74,74,.3); }
.pin-error { color: var(--red); font-size: 13px; font-weight: 700; height: 18px; }
.pin-cancel { background: transparent; border: none; color: var(--text3); font-family: 'Heebo', sans-serif; font-size: 13px; cursor: pointer; margin-top: 6px; }
.pin-cancel:hover { color: var(--text); }

/* ── UNIT LOGO ── */
.ulc-logo {
  width: 52px; height: 52px; border-radius: 10px;
  object-fit: cover; margin-bottom: 8px;
}
.ulc-icon-big { font-size: 32px; margin-bottom: 8px; line-height: 1; }

/* ── EQUIP ALERT ── */
.equip-alert {
  background: var(--redbg);
  border: 1px solid rgba(240,74,74,.3);
  border-radius: var(--r);
  padding: 12px 16px;
  margin-bottom: 10px;
  display: flex; align-items: center; gap: 10px;
  font-size: 13px;
}
.equip-alert-icon { font-size: 20px; }

/* ── CROSS-TASK ASSIGNED BADGE ── */
.assigned-by { font-size: 11px; color: var(--purple); font-weight: 700; }

/* ── SETTINGS panel for admin ── */
.unit-manage-row {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 18px;
  border-bottom: 1px solid var(--border);
}
.unit-manage-row:last-child { border-bottom: none; }
.um-logo {
  width: 40px; height: 40px; border-radius: 8px;
  object-fit: cover; background: var(--bg4);
  display: flex; align-items: center; justify-content: center;
  font-size: 20px; flex-shrink: 0;
}

::-webkit-scrollbar { width: 5px; height: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 3px; }
</style>
</head>
<body>

<!-- ══ PIN SCREEN ══ -->
<div id="pin-screen">
  <div class="pin-box">
    <div class="pin-unit-name" id="pin-unit-name"></div>
    <div class="pin-subtitle">הכנס קוד כניסה</div>
    <div class="pin-dots" id="pin-dots">
      <div class="pin-dot" id="pd0"></div>
      <div class="pin-dot" id="pd1"></div>
      <div class="pin-dot" id="pd2"></div>
      <div class="pin-dot" id="pd3"></div>
    </div>
    <div class="pin-pad">
      <button class="pin-key" onclick="pinPress('1')">1</button>
      <button class="pin-key" onclick="pinPress('2')">2</button>
      <button class="pin-key" onclick="pinPress('3')">3</button>
      <button class="pin-key" onclick="pinPress('4')">4</button>
      <button class="pin-key" onclick="pinPress('5')">5</button>
      <button class="pin-key" onclick="pinPress('6')">6</button>
      <button class="pin-key" onclick="pinPress('7')">7</button>
      <button class="pin-key" onclick="pinPress('8')">8</button>
      <button class="pin-key" onclick="pinPress('9')">9</button>
      <button class="pin-key" onclick="pinPress('')"></button>
      <button class="pin-key" onclick="pinPress('0')">0</button>
      <button class="pin-key del" onclick="pinDel()">⌫</button>
    </div>
    <div class="pin-error" id="pin-error"></div>
    <button class="pin-cancel" onclick="cancelPin()">← ביטול</button>
  </div>
</div>

<!-- ══ LOGIN SCREEN ══ -->
<div id="login-screen">
  <div class="login-logo">✡</div>
  <div class="login-title">רבנות פיקוד מרכז</div>
  <div class="login-sub">מבצע פסח תשפ"ו — בחר יחידה להתחבר</div>
  <div class="units-grid" id="login-units-grid"></div>
</div>

<!-- ══ APP ══ -->
<div id="app">
  <div class="topbar">
    <div class="tb-logo"><span>✡</span> רבנות פיקוד מרכז</div>
    <div class="tb-unit-badge" id="tb-unit-name">—</div>
    <div class="tb-nav">
      <button class="tb-nav-btn active" onclick="goPage('dashboard')" data-page="dashboard">🏠 ראשי</button>
      <button class="tb-nav-btn" onclick="goPage('personnel')" data-page="personnel">👥 כוח אדם</button>
      <button class="tb-nav-btn" onclick="goPage('training')" data-page="training">🎓 הכשרות</button>
      <button class="tb-nav-btn" onclick="goPage('equipment')" data-page="equipment">📦 לוגיסטיקה</button>
      <button class="tb-nav-btn" onclick="goPage('cleaning')" data-page="cleaning">🧹 ניקיונות</button>
      <button class="tb-nav-btn" onclick="goPage('tasks')" data-page="tasks">✅ משימות</button>
      <button class="tb-nav-btn admin-only" onclick="goPage('command')" data-page="command">⭐ פיקוד מרכז</button>
      <button class="tb-nav-btn admin-only" onclick="goPage('unitmanage')" data-page="unitmanage">⚙ ניהול יחידות</button>
    </div>
    <div class="tb-right">
      <div class="countdown-chip">⏳ <span id="tb-countdown">—</span> לפסח</div>
      <div class="clock-chip" id="tb-clock"></div>
      <button class="back-btn" onclick="logout()">← החלף יחידה</button>
    </div>
  </div>

  <!-- DASHBOARD -->
  <div class="page active" id="page-dashboard">
    <div class="hero-banner">
      <div>
        <div class="hero-title" id="hero-unit-title">שלום, —</div>
        <div class="hero-sub" id="hero-unit-sub"></div>
      </div>
      <div class="hero-countdown">
        <div class="countdown-big" id="hero-countdown">—</div>
        <div class="countdown-lbl">ימים לפסח תשפ"ו</div>
      </div>
    </div>
    <div class="kpi-row cols-5">
      <div class="kpi green"><div class="kpi-lbl">הכשרה הושלמה</div><div class="kpi-val green" id="d-trained">—</div><div class="kpi-sub" id="d-trained-sub"></div></div>
      <div class="kpi orange"><div class="kpi-lbl">בהכשרה</div><div class="kpi-val orange" id="d-active">—</div><div class="kpi-sub">ממתינים לסיום</div></div>
      <div class="kpi blue"><div class="kpi-lbl">כוח אדם זמין</div><div class="kpi-val blue" id="d-avail">—</div><div class="kpi-sub" id="d-avail-sub"></div></div>
      <div class="kpi red"><div class="kpi-lbl">ציוד חסר</div><div class="kpi-val red" id="d-equip">—</div><div class="kpi-sub">פריטים</div></div>
      <div class="kpi gold"><div class="kpi-lbl">ניקיון</div><div class="kpi-val gold" id="d-clean">—</div><div class="kpi-sub" id="d-clean-sub"></div></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;">
      <div class="panel">
        <div class="panel-head"><span class="panel-title">👥 כוח אדם — מצב מהיר</span></div>
        <div id="dash-personnel" style="padding:8px 0;"></div>
      </div>
      <div class="panel">
        <div class="panel-head"><span class="panel-title">📝 פעילות אחרונה</span></div>
        <div id="dash-log"></div>
      </div>
    </div>
    <div class="panel">
      <div class="panel-head">
        <span class="panel-title">✅ משימות פתוחות</span>
        <button class="btn sm" onclick="goPage('tasks')">כל המשימות ←</button>
      </div>
      <div id="dash-tasks" style="padding:12px 16px;"></div>
    </div>
  </div>

  <!-- PERSONNEL -->
  <div class="page" id="page-personnel">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
      <h2 style="font-size:18px;font-weight:900;">👥 כוח אדם ומילואים</h2>
      <div style="display:flex;gap:8px;">
        <input class="search" placeholder="חיפוש..." oninput="renderPersonnel(this.value)">
        <button class="btn" onclick="openAddPerson()">+ הוסף איש</button>
      </div>
    </div>
    <div class="kpi-row cols-4">
      <div class="kpi green"><div class="kpi-lbl">זמין</div><div class="kpi-val green" id="p-avail">0</div></div>
      <div class="kpi blue"><div class="kpi-lbl">זום</div><div class="kpi-val blue" id="p-zoom">0</div></div>
      <div class="kpi orange"><div class="kpi-lbl">הגב</div><div class="kpi-val orange" id="p-away">0</div></div>
      <div class="kpi red"><div class="kpi-lbl">שחרור</div><div class="kpi-val red" id="p-leave">0</div></div>
    </div>
    <div id="personnel-list"></div>
  </div>

  <!-- TRAINING -->
  <div class="page" id="page-training">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
      <h2 style="font-size:18px;font-weight:900;">🎓 מעקב הכשרות</h2>
    </div>
    <div id="training-big-prog"></div>
    <div class="panel">
      <div class="panel-head">
        <span class="panel-title">🎓 סטטוס הכשרה — כל הצוות</span>
        <div class="filter-tabs" id="training-filter">
          <button class="ftab active" onclick="filterTraining('all',this)">הכל</button>
          <button class="ftab" onclick="filterTraining('none',this)">טרם</button>
          <button class="ftab" onclick="filterTraining('active',this)">בהכשרה</button>
          <button class="ftab" onclick="filterTraining('done',this)">סיימו</button>
        </div>
      </div>
      <div class="tbl-wrap"><table>
        <thead><tr>
          <th>שם</th><th>תפקיד</th><th>קצינ"ש</th><th>סטטוס</th><th>התחלה</th><th>סיום</th><th>פעולה</th>
        </tr></thead>
        <tbody id="training-tbody"></tbody>
      </table></div>
    </div>
  </div>

  <!-- EQUIPMENT -->
  <div class="page" id="page-equipment">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
      <h2 style="font-size:18px;font-weight:900;">📦 לוגיסטיקה וכשרות</h2>
      <button class="btn" onclick="openAddEquip()">+ הוסף פריט</button>
    </div>
    <div class="kpi-row cols-3">
      <div class="kpi green"><div class="kpi-lbl">מלא</div><div class="kpi-val green" id="eq-full">0</div></div>
      <div class="kpi orange"><div class="kpi-lbl">חלקי</div><div class="kpi-val orange" id="eq-part">0</div></div>
      <div class="kpi red"><div class="kpi-lbl">חסר</div><div class="kpi-val red" id="eq-miss">0</div></div>
    </div>
    <div class="panel">
      <div class="panel-head"><span class="panel-title">📦 מצאי ציוד</span></div>
      <div class="tbl-wrap"><table>
        <thead><tr><th>פריט</th><th>קטגוריה</th><th>קיים</th><th>נדרש</th><th>סטטוס</th><th>%</th><th>עדכון</th></tr></thead>
        <tbody id="equip-tbody"></tbody>
      </table></div>
    </div>
  </div>

  <!-- CLEANING -->
  <div class="page" id="page-cleaning">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
      <h2 style="font-size:18px;font-weight:900;">🧹 יום הניקיונות</h2>
      <div style="display:flex;gap:8px;align-items:center;">
        <span id="clean-summary-chips" style="display:flex;gap:6px;"></span>
        <button class="btn" onclick="openAddArea()">+ אזור</button>
      </div>
    </div>
    <div id="clean-bigprog" style="margin-bottom:16px;"></div>
    <div class="clean-grid" id="clean-grid"></div>
  </div>

  <!-- TASKS -->
  <div class="page" id="page-tasks">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
      <h2 style="font-size:18px;font-weight:900;">✅ ניהול משימות</h2>
      <button class="btn" onclick="openAddTask()">+ משימה חדשה</button>
    </div>
    <div class="filter-tabs" style="margin-bottom:16px;" id="task-filter">
      <button class="ftab active" onclick="filterTasks('all',this)">הכל</button>
      <button class="ftab" onclick="filterTasks('todo',this)">לביצוע</button>
      <button class="ftab" onclick="filterTasks('doing',this)">בתהליך</button>
      <button class="ftab" onclick="filterTasks('done',this)">הושלם</button>
    </div>
    <div id="tasks-list"></div>
  </div>

  <!-- COMMAND (admin/senior) -->
  <div class="page" id="page-command">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
      <h2 style="font-size:18px;font-weight:900;">⭐ דשבורד פיקוד מרכז — כל היחידות</h2>
      <div style="display:flex;gap:8px;">
        <button class="btn blue" onclick="openAssignTask()">📋 שלח משימה ליחידה</button>
        <button class="btn" onclick="openAddUnitAdmin()">+ הוסף יחידה</button>
      </div>
    </div>
    <div id="cmd-equip-alerts"></div>
    <div class="kpi-row cols-5">
      <div class="kpi gold"><div class="kpi-lbl">יחידות</div><div class="kpi-val gold" id="cmd-units">0</div></div>
      <div class="kpi green"><div class="kpi-lbl">סיימו הכשרה</div><div class="kpi-val green" id="cmd-done">0%</div></div>
      <div class="kpi orange"><div class="kpi-lbl">בהכשרה</div><div class="kpi-val orange" id="cmd-active">0</div></div>
      <div class="kpi red"><div class="kpi-lbl">ציוד חסר</div><div class="kpi-val red" id="cmd-equip">0</div></div>
      <div class="kpi blue"><div class="kpi-lbl">ניקיון</div><div class="kpi-val blue" id="cmd-clean">0%</div></div>
    </div>
    <div class="panel">
      <div class="panel-head"><span class="panel-title">📋 כל היחידות — מבט פיקודי</span></div>
      <div class="tbl-wrap"><table>
        <thead><tr>
          <th>יחידה</th><th>קצינ"ש נדרש</th><th>מכשירנים</th><th>ביינשים</th><th>עורך סדר</th>
          <th>הכשרה</th><th>ניקיון</th><th>ציוד</th><th>פעולה</th>
        </tr></thead>
        <tbody id="cmd-tbody"></tbody>
      </table></div>
    </div>
    <div class="panel">
      <div class="panel-head"><span class="panel-title">📦 ניפוק ציוד לפיקוד</span>
        <button class="btn sm" onclick="openDispatchEquip()">+ ניפוק</button>
      </div>
      <div id="cmd-dispatch-log" style="padding:4px 0;"></div>
    </div>
  </div>

  <!-- UNIT MANAGEMENT PAGE -->
  <div class="page" id="page-unitmanage">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
      <h2 style="font-size:18px;font-weight:900;">⚙ ניהול יחידות — לוגואים וקודים</h2>
      <button class="btn" onclick="openAddUnitAdmin()">+ יחידה חדשה</button>
    </div>
    <div class="panel">
      <div class="panel-head"><span class="panel-title">🖼 לוגואים, קודי כניסה וניהול</span></div>
      <div id="unit-manage-list"></div>
    </div>
  </div>
</div>

<!-- MODAL -->
<div class="overlay" id="overlay" onclick="if(event.target===this)closeModal()">
  <div class="modal" id="modal-body"></div>
</div>
<div class="toast" id="toast"></div>

<script>
// ════════════ DATA ════════════
const UNITS = [
  { id:'binyamin',  name:'חטמ"ר בנימין',   icon:'🛡', brigade:'חטמ"רים',    isAdmin:false, pin:null,   logo:null },
  { id:'shomron',   name:'חטמ"ר שומרון',   icon:'🛡', brigade:'חטמ"רים',    isAdmin:false, pin:null,   logo:null },
  { id:'yehuda',    name:'חטמ"ר יהודה',    icon:'🛡', brigade:'חטמ"רים',    isAdmin:false, pin:null,   logo:null },
  { id:'etzion',    name:'חטמ"ר עציון',    icon:'🛡', brigade:'חטמ"רים',    isAdmin:false, pin:null,   logo:null },
  { id:'efraim',    name:'חטמ"ר אפרים',    icon:'🛡', brigade:'חטמ"רים',    isAdmin:false, pin:null,   logo:null },
  { id:'menashe',   name:'חטמ"ר מנשה',     icon:'🛡', brigade:'חטמ"רים',    isAdmin:false, pin:null,   logo:null },
  { id:'habikaa',   name:'חטמ"ר הבקעה',    icon:'🛡', brigade:'חטמ"רים',    isAdmin:false, pin:null,   logo:null },
  { id:'hativa_35', name:'חטיבה 35',        icon:'⚔', brigade:'חטיבות',     isAdmin:false, pin:null,   logo:null },
  { id:'hativa_89', name:'חטיבה 89',        icon:'⚔', brigade:'חטיבות',     isAdmin:false, pin:null,   logo:null },
  { id:'hativa_900',name:'חטיבה 900',       icon:'⚔', brigade:'חטיבות',     isAdmin:false, pin:null,   logo:null },
  { id:'ugdat_877', name:'אוגדת 877',        icon:'🎖', brigade:'אוגדות',     isAdmin:false, pin:'8770', logo:null, isSenior:true },
  { id:'ugda_96',   name:'אוגדת 96',         icon:'🎖', brigade:'אוגדות',     isAdmin:false, pin:'9600', logo:null, isSenior:true },
  { id:'ugda_98',   name:'אוגדת 98',         icon:'🎖', brigade:'אוגדות',     isAdmin:false, pin:'9800', logo:null, isSenior:true },
  { id:'pikud',     name:'פיקוד מרכז',       icon:'⭐', brigade:'פיקוד',      isAdmin:true,  pin:'1234', logo:null },
];

// Per-unit stores (in memory)
const STORE = {};
const DISPATCH_LOG = []; // global dispatch log

UNITS.forEach(u => {
  STORE[u.id] = {
    personnel: [],
    equipment: [],
    areas: [],
    tasks: [],
    log: [],
    controllers_needed: Math.floor(Math.random()*3)+2,
    trainers: Math.floor(Math.random()*2)+1,
    beinashim: Math.floor(Math.random()*3)+1,
    seder_editor: ['סמ"ר כהן','סמ"ר לוי','רס"ל שרון'][Math.floor(Math.random()*3)],
    training_status: ['none','none','active','done'][Math.floor(Math.random()*4)],
    training_start: '',
    training_end: '',
    clean_pct: Math.floor(Math.random()*80)+20,
  };
  seedUnit(u.id);
});

function seedUnit(uid){
  const s = STORE[uid];
  const roles = ['מכשיר','ביינש','ביינש','עורך סדר','קצ"ש','סגל','קצ"ש'];
  const names = [
    'סרן אביב כהן','רס"ל דנה לוי','סמ"ר יובל מזרחי',
    'סמ"ל נועם פרידמן','סמ"ר תמר שרון','טור\' ליאור בר',
    'רס"ן אורן ברק','סמ"ר ספיר אלי'
  ];
  const statuses = ['available','available','zoom','away','leave'];
  names.forEach((nm,i)=>{
    s.personnel.push({
      id: i+1, name:nm,
      role: roles[i % roles.length],
      status: statuses[Math.floor(Math.random()*statuses.length)],
      training_status: Math.random()>.4 ? 'done' : Math.random()>.5 ? 'active' : 'none',
      training_start: Math.random()>.5 ? '01/04/2025' : '',
      training_end: Math.random()>.5 ? '08/04/2025' : '',
      controllers_needed: i===0 ? 1 : 0,
    });
  });

  const equips = [
    {name:'הגדות פסח',cat:'כשרות',have:Math.floor(Math.random()*30)+5,need:30},
    {name:'שקיות ניקיון',cat:'ניקיון',have:Math.floor(Math.random()*40)+10,need:50},
    {name:'כלי עברית',cat:'כשרות',have:Math.floor(Math.random()*8)+2,need:10},
    {name:'כסאות לסדר',cat:'לוגיסטיקה',have:Math.floor(Math.random()*30)+20,need:50},
    {name:'נרות בדיקת חמץ',cat:'כשרות',have:Math.floor(Math.random()*5)+1,need:5},
    {name:'חומר ניקוי',cat:'ניקיון',have:Math.floor(Math.random()*10)+2,need:15},
  ];
  equips.forEach((e,i) => s.equipment.push({id:i+1,...e}));

  const areaNames = ['חדר אוכל','מטבח','מחסן מזון','צריף','חצר','שירותים'];
  const cleanStats = ['clean','clean','partial','dirty'];
  areaNames.forEach((nm,i)=>{
    s.areas.push({id:i+1,name:nm,status:cleanStats[i%cleanStats.length]});
  });

  const tasks = [
    {id:1,title:'בדיקת חמץ',desc:'בדיקת כל מרחבי היחידה לחמץ',priority:'high',status:'todo',date:'12/04/2025'},
    {id:2,title:'ניקוי מטבח',desc:'ניקיון וחיטוי מטבח מחמץ',priority:'urgent',status:'doing',date:'10/04/2025'},
    {id:3,title:'הזמנת מצות',desc:'הזמנת מצות לסדר יחידתי',priority:'normal',status:'done',date:'05/04/2025'},
  ];
  s.tasks = tasks;

  s.log = [
    {text:'המערכת נטענה', color:'gold', time: now()},
  ];
}

function now(){ return new Date().toLocaleTimeString('he-IL',{hour:'2-digit',minute:'2-digit'}); }
let nextId = 1000;
function uid(){ return ++nextId; }

// ════════════ STATE ════════════
let currentUnit = null;
let isAdmin = false;
let isSenior = false; // אוגדות
let pinTarget = null;
let pinVal = '';

// ════════════ LOGIN ════════════
function renderLogin(){
  const grid = document.getElementById('login-units-grid');
  // Group by brigade
  const brigades = [...new Set(UNITS.map(u=>u.brigade))];
  grid.innerHTML = brigades.map(br=>{
    const units = UNITS.filter(u=>u.brigade===br);
    return `<div style="grid-column:1/-1;font-size:12px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.6px;margin-bottom:4px;margin-top:8px;">${br}</div>` +
      units.map(u=>`
      <div class="unit-login-card ${u.isAdmin?'admin':u.isSenior?'senior':''}" onclick="tryLogin('${u.id}')">
        ${u.logo
          ? `<img src="${u.logo}" class="ulc-logo">`
          : `<div class="ulc-icon-big">${u.icon}</div>`}
        <div class="ulc-name">${u.name}</div>
        <div class="ulc-type">${u.isAdmin?'פיקוד מרכז — גישה מלאה':u.isSenior?'🔒 אוגדה — דרוש קוד':'יחידה'}</div>
      </div>`).join('');
  }).join('');
}

function tryLogin(unitId){
  const u = UNITS.find(x=>x.id===unitId);
  if(u.pin){
    pinTarget = unitId;
    pinVal = '';
    updatePinDots();
    document.getElementById('pin-unit-name').textContent = u.name;
    document.getElementById('pin-error').textContent = '';
    document.getElementById('pin-screen').classList.add('open');
  } else {
    doLogin(unitId);
  }
}

// ── PIN LOGIC ──
function pinPress(d){
  if(!d) return;
  if(pinVal.length >= 4) return;
  pinVal += d;
  updatePinDots();
  if(pinVal.length === 4) {
    setTimeout(checkPin, 100);
  }
}
function pinDel(){ pinVal = pinVal.slice(0,-1); updatePinDots(); document.getElementById('pin-error').textContent=''; }
function updatePinDots(){
  for(let i=0;i<4;i++){
    document.getElementById('pd'+i).classList.toggle('filled', i < pinVal.length);
  }
}
function checkPin(){
  const u = UNITS.find(x=>x.id===pinTarget);
  if(pinVal === u.pin){
    document.getElementById('pin-screen').classList.remove('open');
    doLogin(pinTarget);
  } else {
    document.getElementById('pin-error').textContent = '❌ קוד שגוי, נסה שוב';
    pinVal = ''; updatePinDots();
  }
}
function cancelPin(){
  document.getElementById('pin-screen').classList.remove('open');
  pinTarget = null; pinVal = '';
}

function doLogin(unitId){
  currentUnit = unitId;
  const u = UNITS.find(x=>x.id===unitId);
  isAdmin = u.isAdmin;
  isSenior = u.isSenior || false;
  document.getElementById('login-screen').style.display='none';
  document.getElementById('app').style.display='block';
  document.getElementById('tb-unit-name').textContent = u.name;
  document.getElementById('hero-unit-title').textContent = `שלום, ${u.name}`;
  document.getElementById('hero-unit-sub').textContent = 'גישה מלאה למערכת מבצע פסח תשפ"ו — רבנות פיקוד מרכז';
  // Show admin tabs only for admin/senior
  document.querySelectorAll('.admin-only').forEach(el=>{
    el.style.display = (isAdmin || isSenior) ? 'flex' : 'none';
  });
  goPage('dashboard');
  updateCountdown();
  setInterval(updateCountdown, 60000);
  setInterval(tickClock, 1000); tickClock();
}

function login(unitId){ doLogin(unitId); } // alias for command page "כנס" button

function logout(){
  document.getElementById('login-screen').style.display='flex';
  document.getElementById('app').style.display='none';
  currentUnit = null; isAdmin = false; isSenior = false;
}

// ════════════ CLOCK / COUNTDOWN ════════════
function tickClock(){
  document.getElementById('tb-clock').textContent =
    new Date().toLocaleTimeString('he-IL',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
}
function updateCountdown(){
  const pesach = new Date('2026-04-02');
  const diff = Math.max(0, Math.ceil((pesach - new Date())/(1000*60*60*24)));
  document.getElementById('hero-countdown').textContent = diff;
  document.getElementById('tb-countdown').textContent = diff + ' ימים';
}

// ════════════ NAVIGATION ════════════
function goPage(name){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.tb-nav-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('page-'+name).classList.add('active');
  document.querySelector(`[data-page="${name}"]`)?.classList.add('active');
  if(name==='dashboard') renderDashboard();
  if(name==='personnel') renderPersonnel();
  if(name==='training') renderTraining();
  if(name==='equipment') renderEquipment();
  if(name==='cleaning') renderCleaning();
  if(name==='tasks') renderTasks();
  if(name==='command') renderCommand();
  if(name==='unitmanage') renderUnitManage();
}

function store(){ return STORE[currentUnit]; }

// ════════════ DASHBOARD ════════════
function renderDashboard(){
  const s = store();
  const allPeople = s.personnel;
  const trainedCount = allPeople.filter(p=>p.training_status==='done').length;
  const activeCount = allPeople.filter(p=>p.training_status==='active').length;
  const availCount = allPeople.filter(p=>p.status==='available').length;
  const missingEquip = s.equipment.filter(e=>e.have<e.need).length;
  const cleanAreas = s.areas.filter(a=>a.status==='clean').length;
  const cleanPct = s.areas.length ? Math.round(cleanAreas/s.areas.length*100) : 0;

  document.getElementById('d-trained').textContent = trainedCount;
  document.getElementById('d-trained-sub').textContent = `מתוך ${allPeople.length} אנשים`;
  document.getElementById('d-active').textContent = activeCount;
  document.getElementById('d-avail').textContent = availCount;
  document.getElementById('d-avail-sub').textContent = `מתוך ${allPeople.length}`;
  document.getElementById('d-equip').textContent = missingEquip;
  document.getElementById('d-clean').textContent = cleanPct+'%';
  document.getElementById('d-clean-sub').textContent = `${cleanAreas}/${s.areas.length} אזורים`;

  // Personnel quick view
  const pl = document.getElementById('dash-personnel');
  const statusLabel = {available:'זמין',zoom:'זום',away:'הגב',leave:'שחרור'};
  const statusColor = {available:'var(--green)',zoom:'var(--blue)',away:'var(--orange)',leave:'var(--red)'};
  pl.innerHTML = allPeople.slice(0,6).map(p=>`
    <div style="display:flex;align-items:center;justify-content:space-between;padding:9px 18px;border-bottom:1px solid rgba(42,47,66,.4);">
      <div>
        <div style="font-size:13px;font-weight:700;">${p.name}</div>
        <div style="font-size:11px;color:var(--text3);">${p.role}</div>
      </div>
      <span class="badge" style="background:${statusColor[p.status]}20;color:${statusColor[p.status]};border:1px solid ${statusColor[p.status]}40;">
        ${statusLabel[p.status]}
      </span>
    </div>`).join('');

  // Log
  const logEl = document.getElementById('dash-log');
  logEl.innerHTML = s.log.slice(0,6).map(l=>`
    <div class="log-item">
      <div class="log-dot" style="background:var(--${l.color})"></div>
      <div style="flex:1">${l.text}</div>
      <div style="font-size:11px;color:var(--text3)">${l.time}</div>
    </div>`).join('') || '<div style="padding:16px;color:var(--text3);font-size:12px;">אין פעילות</div>';

  // Tasks preview
  const openTasks = s.tasks.filter(t=>t.status!=='done').slice(0,3);
  document.getElementById('dash-tasks').innerHTML = openTasks.length ?
    openTasks.map(t=>`
      <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);">
        <span class="badge ${t.priority==='urgent'?'red':t.priority==='high'?'orange':'blue'}">${t.priority==='urgent'?'דחוף':t.priority==='high'?'גבוה':'בינוני'}</span>
        <span style="font-size:13px;font-weight:700;">${t.title}</span>
        <span style="margin-right:auto;font-size:12px;color:var(--text3);">${t.date}</span>
      </div>`).join('')
    : '<div style="color:var(--text3);font-size:13px;">אין משימות פתוחות 🎉</div>';
}

// ════════════ PERSONNEL ════════════
function renderPersonnel(q=''){
  const s = store();
  let people = s.personnel;
  if(q) people = people.filter(p=>p.name.includes(q)||p.role.includes(q));

  const counts = {available:0,zoom:0,away:0,leave:0};
  s.personnel.forEach(p=>{ if(counts[p.status]!==undefined) counts[p.status]++; });
  document.getElementById('p-avail').textContent = counts.available;
  document.getElementById('p-zoom').textContent = counts.zoom;
  document.getElementById('p-away').textContent = counts.away;
  document.getElementById('p-leave').textContent = counts.leave;

  const statusOpts = [
    {key:'available',label:'זמין',cls:'available'},
    {key:'zoom',label:'זום',cls:'zoom'},
    {key:'away',label:'הגב',cls:'away'},
    {key:'leave',label:'שחרור',cls:'leave'},
  ];
  const icons = {מכשיר:'🎓',ביינש:'⚖️','עורך סדר':'📜','קצ"ש':'⭐',סגל:'👤'};
  const container = document.getElementById('personnel-list');
  container.innerHTML = people.map(p=>`
    <div class="person-card" id="pc-${p.id}">
      <div class="person-avatar">${icons[p.role]||'👤'}</div>
      <div>
        <div class="person-name">${p.name}</div>
        <div class="person-role">${p.role} · הכשרה: <span style="color:${p.training_status==='done'?'var(--green)':p.training_status==='active'?'var(--orange)':'var(--text3)'}">${p.training_status==='done'?'הוכשר':p.training_status==='active'?'בהכשרה':'טרם'}</span></div>
      </div>
      <div class="person-actions">
        ${statusOpts.map(o=>`<button class="status-pill ${o.cls} ${p.status===o.key?'':'ghost'}" 
          style="${p.status===o.key?'':'background:transparent;border-color:var(--border);color:var(--text3);'}"
          onclick="setPersonStatus(${p.id},'${o.key}')">${o.label}</button>`).join('')}
      </div>
      <button class="btn sm red" onclick="removePerson(${p.id})" style="flex-shrink:0;">🗑</button>
    </div>`).join('') || '<div style="padding:30px;text-align:center;color:var(--text3);">אין אנשים</div>';
}

function setPersonStatus(pid, status){
  const p = store().personnel.find(x=>x.id===pid);
  if(!p) return;
  p.status = status;
  const labels = {available:'זמין',zoom:'זום',away:'הגב',leave:'שחרור'};
  addLog(`${p.name} — סטטוס שונה ל${labels[status]}`, 'blue');
  renderPersonnel();
  renderDashboard();
}
function removePerson(pid){
  const s = store();
  const p = s.personnel.find(x=>x.id===pid);
  if(!p||!confirm('למחוק?')) return;
  s.personnel = s.personnel.filter(x=>x.id!==pid);
  addLog(`${p.name} הוסר`, 'red');
  renderPersonnel();
}

// ════════════ TRAINING ════════════
let trainingFilter = 'all';
function filterTraining(f, el){
  trainingFilter = f;
  document.querySelectorAll('#training-filter .ftab').forEach(b=>b.classList.remove('active'));
  el.classList.add('active');
  renderTraining();
}

function renderTraining(){
  const s = store();
  const people = s.personnel;
  const done = people.filter(p=>p.training_status==='done').length;
  const pct = Math.round(done/Math.max(people.length,1)*100);

  document.getElementById('training-big-prog').innerHTML = `
    <div class="big-prog">
      <div class="big-num">${pct}%</div>
      <div class="big-info">
        <h3>אחוז הכשרה — ${store()===STORE[currentUnit]?UNITS.find(u=>u.id===currentUnit)?.name:''}</h3>
        <div class="big-bar"><div class="big-bar-fill" style="width:${pct}%"></div></div>
        <div class="big-sub">${done} מתוך ${people.length} אנשים הוכשרו · <span style="color:var(--orange)">${people.filter(p=>p.training_status==='active').length} בהכשרה</span></div>
      </div>
      <div style="text-align:center;">
        <div style="font-size:13px;color:var(--text3);margin-bottom:4px;">קצינ"ש נדרש</div>
        <div style="font-size:40px;font-weight:900;color:var(--gold)">${s.controllers_needed}</div>
      </div>
    </div>`;

  let filtered = people;
  if(trainingFilter!=='all') filtered = people.filter(p=>p.training_status===trainingFilter);

  const tbody = document.getElementById('training-tbody');
  tbody.innerHTML = filtered.map(p=>{
    const stCls={done:'green',active:'orange',none:'dim'}[p.training_status];
    const stLbl={done:'✓ הוכשר',active:'◉ בהכשרה',none:'○ טרם'}[p.training_status];
    return `<tr>
      <td><strong>${p.name}</strong></td>
      <td><span class="badge gold">${p.role}</span></td>
      <td style="text-align:center;">${p.controllers_needed||'—'}</td>
      <td><div class="training-row-status">
        <div class="tr-dot ${p.training_status}"></div>
        <span class="badge ${stCls}">${stLbl}</span>
      </div></td>
      <td style="font-size:12px;color:var(--text3)">${p.training_start||'—'}</td>
      <td style="font-size:12px;color:var(--text3)">${p.training_end||'—'}</td>
      <td><div style="display:flex;gap:5px;">
        ${p.training_status==='none'?`<button class="btn sm orange" onclick="startTr(${p.id})">▶ התחל</button>`:''}
        ${p.training_status==='active'?`<button class="btn sm green" onclick="endTr(${p.id})">✓ סיים</button>`:''}
        ${p.training_status==='done'?`<button class="btn sm ghost" onclick="resetTr(${p.id})">↺</button>`:''}
      </div></td>
    </tr>`;
  }).join('');
}

function startTr(pid){ const p=store().personnel.find(x=>x.id===pid); p.training_status='active'; p.training_start=new Date().toLocaleDateString('he-IL'); addLog(`${p.name} התחיל הכשרה`,'orange'); toast(`${p.name}: הכשרה החלה`,'gold'); renderTraining(); }
function endTr(pid){ const p=store().personnel.find(x=>x.id===pid); p.training_status='done'; p.training_end=new Date().toLocaleDateString('he-IL'); addLog(`${p.name} סיים הכשרה ✓`,'green'); toast(`${p.name}: הוכשר! 🎉`,'green'); renderTraining(); }
function resetTr(pid){ const p=store().personnel.find(x=>x.id===pid); p.training_status='none'; p.training_start=''; p.training_end=''; renderTraining(); }

// ════════════ EQUIPMENT ════════════
function renderEquipment(){
  const eq = store().equipment;
  let full=0,part=0,miss=0;
  const tbody = document.getElementById('equip-tbody');
  tbody.innerHTML = eq.map(e=>{
    const pct=Math.min(100,Math.round(e.have/Math.max(e.need,1)*100));
    let st,stLbl,bc;
    if(pct>=100){st='green';stLbl='✓ מלא';bc='var(--green)';full++;}
    else if(pct>=50){st='orange';stLbl='⚠ חלקי';bc='var(--orange)';part++;}
    else{st='red';stLbl='✗ חסר';bc='var(--red)';miss++;}
    return `<tr>
      <td><strong>${e.name}</strong></td>
      <td><span class="badge dim">${e.cat}</span></td>
      <td style="font-weight:700">${e.have}</td>
      <td style="color:var(--text3)">${e.need}</td>
      <td><span class="badge ${st}">${stLbl}</span></td>
      <td><div style="display:flex;align-items:center;gap:8px;">
        <div class="pbar" style="min-width:80px;"><div class="pbar-fill" style="width:${pct}%;background:${bc}"></div></div>
        <span style="font-size:11px;color:var(--text3)">${pct}%</span>
      </div></td>
      <td><div style="display:flex;gap:4px;">
        <button class="btn xs green" onclick="chEq(${e.id},1)">+</button>
        <button class="btn xs red" onclick="chEq(${e.id},-1)">−</button>
      </div></td>
    </tr>`;
  }).join('');
  document.getElementById('eq-full').textContent=full;
  document.getElementById('eq-part').textContent=part;
  document.getElementById('eq-miss').textContent=miss;
}
function chEq(id,d){ const e=store().equipment.find(x=>x.id===id); e.have=Math.max(0,e.have+d); addLog(`${e.name}: ${e.have}/${e.need}`,'blue'); renderEquipment(); renderDashboard(); }

// ════════════ CLEANING ════════════
function renderCleaning(){
  const areas = store().areas;
  let clean=0,partial=0,dirty=0;
  areas.forEach(a=>{ if(a.status==='clean') clean++; else if(a.status==='partial') partial++; else dirty++; });
  const pct = Math.round(clean/Math.max(areas.length,1)*100);

  document.getElementById('clean-summary-chips').innerHTML=`
    <span class="badge green">✅ ${clean}</span>
    <span class="badge orange">🔄 ${partial}</span>
    <span class="badge red">❌ ${dirty}</span>`;

  document.getElementById('clean-bigprog').innerHTML=`
    <div class="big-prog">
      <div style="font-size:48px;font-weight:900;color:${pct>=80?'var(--green)':pct>=50?'var(--orange)':'var(--red)'}">${pct}%</div>
      <div class="big-info">
        <h3>מצב ניקיון — ${UNITS.find(u=>u.id===currentUnit)?.name}</h3>
        <div class="big-bar"><div class="big-bar-fill" style="width:${pct}%;background:${pct>=80?'var(--green)':pct>=50?'var(--orange)':'var(--red)'}"></div></div>
        <div class="big-sub">${clean} מתוך ${areas.length} אזורים נקיים</div>
      </div>
    </div>`;

  const icons={clean:'✅',partial:'🔄',dirty:'🧹'};
  const labels={clean:'נקי',partial:'בתהליך',dirty:'לא נוקה'};
  document.getElementById('clean-grid').innerHTML = areas.map(a=>`
    <div class="clean-card ${a.status}" onclick="cycleClean(${a.id})">
      <div class="clean-icon">${icons[a.status]}</div>
      <div class="clean-name">${a.name}</div>
      <div class="clean-unit"><span class="badge ${a.status==='clean'?'green':a.status==='partial'?'orange':'red'}">${labels[a.status]}</span></div>
      <div style="font-size:10px;color:var(--text3);margin-top:6px;">לחץ לשינוי</div>
    </div>`).join('');
}
function cycleClean(id){
  const a=store().areas.find(x=>x.id===id);
  const c={clean:'partial',partial:'dirty',dirty:'clean'};
  const l={clean:'נקי',partial:'בתהליך',dirty:'לא נוקה'};
  const old=a.status; a.status=c[old];
  addLog(`${a.name}: ${l[old]} → ${l[a.status]}`, a.status==='clean'?'green':'orange');
  renderCleaning(); renderDashboard();
}

// ════════════ TASKS ════════════
let taskFilter = 'all';
function filterTasks(f,el){ taskFilter=f; document.querySelectorAll('#task-filter .ftab').forEach(b=>b.classList.remove('active')); el.classList.add('active'); renderTasks(); }

function renderTasks(){
  let tasks = store().tasks;
  if(taskFilter!=='all') tasks=tasks.filter(t=>t.status===taskFilter);

  const pCls={urgent:'red',high:'orange',normal:'blue'};
  const pLbl={urgent:'דחוף',high:'גבוה',normal:'בינוני'};
  const sCls={todo:'dim',doing:'orange',done:'green'};
  const sLbl={todo:'לביצוע',doing:'בתהליך',done:'הושלם'};

  document.getElementById('tasks-list').innerHTML = tasks.map(t=>`
    <div class="task-card">
      <div class="task-header">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <span class="task-title">${t.title}</span>
          <span class="badge ${pCls[t.priority]}">${pLbl[t.priority]}</span>
          ${t.assignedBy?`<span class="badge purple">📤 מ${t.assignedBy}</span>`:''}
        </div>
        <div style="display:flex;gap:6px;align-items:center;">
          <span class="badge ${sCls[t.status]}">${sLbl[t.status]}</span>
          <button class="btn xs" onclick="cycleTaskStatus(${t.id})">→ הבא</button>
          <button class="btn xs red" onclick="deleteTask(${t.id})">🗑</button>
        </div>
      </div>
      <div class="task-meta">${t.desc||''}${t.desc&&t.date?' · ':''}${t.date?'📅 '+t.date:''}</div>
    </div>`).join('') || '<div style="padding:40px;text-align:center;color:var(--text3);">אין משימות</div>';
}

function cycleTaskStatus(id){
  const t=store().tasks.find(x=>x.id===id);
  const c={todo:'doing',doing:'done',done:'todo'};
  t.status=c[t.status];
  addLog(`משימה "${t.title}" → ${t.status==='doing'?'בתהליך':t.status==='done'?'הושלם':'לביצוע'}`,'blue');
  renderTasks(); renderDashboard();
}
function deleteTask(id){
  const s=store(); const t=s.tasks.find(x=>x.id===id);
  if(!t||!confirm('למחוק?')) return;
  s.tasks=s.tasks.filter(x=>x.id!==id);
  renderTasks();
}

// ════════════ COMMAND VIEW ════════════
function renderCommand(){
  let totalDone=0,totalActive=0,totalPeople=0,totalMissing=0,totalClean=0,totalAreas=0;
  UNITS.filter(u=>!u.isAdmin).forEach(u=>{
    const s=STORE[u.id];
    totalDone += s.personnel.filter(p=>p.training_status==='done').length;
    totalActive += s.personnel.filter(p=>p.training_status==='active').length;
    totalPeople += s.personnel.length;
    totalMissing += s.equipment.filter(e=>e.have<e.need).length;
    totalClean += s.areas.filter(a=>a.status==='clean').length;
    totalAreas += s.areas.length;
  });
  const units = UNITS.filter(u=>!u.isAdmin);
  document.getElementById('cmd-units').textContent = units.length;
  document.getElementById('cmd-done').textContent = Math.round(totalDone/Math.max(totalPeople,1)*100)+'%';
  document.getElementById('cmd-active').textContent = totalActive;
  document.getElementById('cmd-equip').textContent = totalMissing;
  document.getElementById('cmd-clean').textContent = Math.round(totalClean/Math.max(totalAreas,1)*100)+'%';

  // Equipment alerts
  const alertsEl = document.getElementById('cmd-equip-alerts');
  const alerts = [];
  units.forEach(u=>{
    STORE[u.id].equipment.filter(e=>e.have<e.need).forEach(e=>{
      alerts.push({unit:u.name, item:e.name, have:e.have, need:e.need});
    });
  });
  alertsEl.innerHTML = alerts.slice(0,5).map(a=>`
    <div class="equip-alert">
      <div class="equip-alert-icon">⚠️</div>
      <div><strong>${a.unit}</strong> — <strong>${a.item}</strong>: יש ${a.have} מתוך ${a.need} נדרשים
      <span class="badge red" style="margin-right:8px;">חסר ${a.need-a.have}</span></div>
    </div>`).join('');

  const tbody = document.getElementById('cmd-tbody');
  tbody.innerHTML = units.map(u=>{
    const s=STORE[u.id];
    const done=s.personnel.filter(p=>p.training_status==='done').length;
    const pct=Math.round(done/Math.max(s.personnel.length,1)*100);
    const cleanPct=Math.round(s.areas.filter(a=>a.status==='clean').length/Math.max(s.areas.length,1)*100);
    const equipMissing=s.equipment.filter(e=>e.have<e.need).length;
    const logoHtml = u.logo ? `<img src="${u.logo}" style="width:28px;height:28px;border-radius:5px;object-fit:cover;margin-left:6px;vertical-align:middle;">` : `<span style="margin-left:6px;">${u.icon}</span>`;
    return `<tr>
      <td>${logoHtml}<strong>${u.name}</strong></td>
      <td style="text-align:center;font-size:18px;font-weight:900;color:var(--gold)">${s.controllers_needed}</td>
      <td style="text-align:center;">${s.trainers}</td>
      <td style="text-align:center;">${s.beinashim}</td>
      <td style="font-size:12px;">${s.seder_editor}</td>
      <td>
        <div style="display:flex;align-items:center;gap:8px;">
          <div class="pbar" style="min-width:70px;"><div class="pbar-fill" style="width:${pct}%;background:${pct===100?'var(--green)':pct>50?'var(--orange)':'var(--red)'}"></div></div>
          <span class="badge ${pct===100?'green':pct>50?'orange':'red'}">${pct}%</span>
        </div>
      </td>
      <td><span class="badge ${cleanPct>=80?'green':cleanPct>=50?'orange':'red'}">${cleanPct}%</span></td>
      <td><span class="badge ${equipMissing===0?'green':'red'}">${equipMissing===0?'✓ תקין':'⚠ חסר '+equipMissing}</span></td>
      <td><div style="display:flex;gap:4px;">
        <button class="btn sm" onclick="doLogin('${u.id}')">כנס ←</button>
        <button class="btn sm blue" onclick="openAssignTaskTo('${u.id}')">📋</button>
      </div></td>
    </tr>`;
  }).join('');

  // Dispatch log
  const dl = document.getElementById('cmd-dispatch-log');
  dl.innerHTML = DISPATCH_LOG.slice(0,8).map(d=>`
    <div class="log-item">
      <div class="log-dot" style="background:var(--blue)"></div>
      <div style="flex:1">${d.text}</div>
      <div style="font-size:11px;color:var(--text3)">${d.time}</div>
    </div>`).join('') || '<div style="padding:14px 18px;color:var(--text3);font-size:13px;">אין ניפוקים עדיין</div>';
}

// ════════════ UNIT MANAGE ════════════
function renderUnitManage(){
  const list = document.getElementById('unit-manage-list');
  list.innerHTML = UNITS.filter(u=>!u.isAdmin).map(u=>`
    <div class="unit-manage-row">
      <div class="um-logo">
        ${u.logo ? `<img src="${u.logo}" style="width:40px;height:40px;border-radius:8px;object-fit:cover;">` : u.icon}
      </div>
      <div style="flex:1;">
        <div style="font-weight:800;font-size:14px;">${u.name}</div>
        <div style="font-size:12px;color:var(--text3);">${u.brigade} · קוד: ${u.pin||'ללא קוד'}</div>
      </div>
      <div style="display:flex;gap:6px;">
        <label class="btn sm blue" style="cursor:pointer;">
          🖼 לוגו
          <input type="file" accept="image/*" style="display:none" onchange="uploadLogo('${u.id}',this)">
        </label>
        <button class="btn sm" onclick="openSetPin('${u.id}')">🔒 קוד</button>
        <button class="btn sm red" onclick="openEditUnitName('${u.id}')">✏ שם</button>
      </div>
    </div>`).join('');
}

function uploadLogo(unitId, input){
  const file = input.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = e=>{
    const u = UNITS.find(x=>x.id===unitId);
    u.logo = e.target.result;
    toast(`לוגו ${u.name} עודכן! 🖼`,'green');
    renderUnitManage();
    renderLogin();
  };
  reader.readAsDataURL(file);
}

function openSetPin(unitId){
  const u = UNITS.find(x=>x.id===unitId);
  openModal(`<div class="modal-title">🔒 הגדרת קוד כניסה — ${u.name}</div>
    <div style="font-size:13px;color:var(--text3);margin-bottom:16px;">קוד 4 ספרות. השאר ריק להסרת הקוד.</div>
    <div class="form-row"><label class="form-label">קוד (4 ספרות)</label>
      <input class="form-input" id="m-pin" type="password" maxlength="4" placeholder="ללא קוד = גישה חופשית" value="${u.pin||''}"></div>
    <div class="modal-btns">
      <button class="btn ghost" onclick="closeModal()">ביטול</button>
      <button class="btn red" onclick="savePin('${unitId}')">שמור קוד</button>
    </div>`);
}
function savePin(uid){
  const val = document.getElementById('m-pin').value.trim();
  if(val && (!/^\d{4}$/.test(val))) { alert('קוד חייב להיות 4 ספרות'); return; }
  UNITS.find(x=>x.id===uid).pin = val || null;
  toast('קוד עודכן ✅','green');
  closeModal(); renderUnitManage();
}

function openEditUnitName(uid){
  const u = UNITS.find(x=>x.id===uid);
  openModal(`<div class="modal-title">✏️ עריכת שם — ${u.name}</div>
    <div class="form-row"><label class="form-label">שם חדש</label>
      <input class="form-input" id="m-uname2" value="${u.name}"></div>
    <div class="modal-btns">
      <button class="btn ghost" onclick="closeModal()">ביטול</button>
      <button class="btn" onclick="saveUnitName('${uid}')">שמור</button>
    </div>`);
}
function saveUnitName(uid){
  const u = UNITS.find(x=>x.id===uid);
  u.name = document.getElementById('m-uname2').value.trim() || u.name;
  closeModal(); renderUnitManage(); renderLogin();
}

// ════════════ ASSIGN TASK TO UNIT ════════════
function openAssignTask(){
  openAssignTaskTo(null);
}
function openAssignTaskTo(preselect){
  const nonAdmin = UNITS.filter(u=>!u.isAdmin);
  openModal(`<div class="modal-title">📋 שלח משימה ליחידה</div>
    <div class="form-row"><label class="form-label">יחידה יעד</label>
      <select class="form-input" id="m-target-unit">
        <option value="">— כל היחידות —</option>
        ${nonAdmin.map(u=>`<option value="${u.id}" ${u.id===preselect?'selected':''}>${u.name}</option>`).join('')}
      </select></div>
    <div class="form-row"><label class="form-label">כותרת המשימה</label>
      <input class="form-input" id="m-tname"></div>
    <div class="form-row"><label class="form-label">תיאור</label>
      <input class="form-input" id="m-tdesc"></div>
    <div class="form-grid">
      <div class="form-row"><label class="form-label">עדיפות</label>
        <select class="form-input" id="m-tpri">
          <option value="urgent">דחוף</option><option value="high">גבוה</option><option value="normal">בינוני</option>
        </select></div>
      <div class="form-row"><label class="form-label">תאריך יעד</label>
        <input class="form-input" id="m-tdate" type="date"></div>
    </div>
    <div class="modal-btns">
      <button class="btn ghost" onclick="closeModal()">ביטול</button>
      <button class="btn blue" onclick="saveAssignedTask()">📤 שלח משימה</button>
    </div>`);
}

function saveAssignedTask(){
  const title = document.getElementById('m-tname').value.trim();
  if(!title) return alert('נא הכנס כותרת');
  const targetId = document.getElementById('m-target-unit').value;
  const d = document.getElementById('m-tdate').value;
  const dateStr = d ? new Date(d).toLocaleDateString('he-IL') : 'ללא תאריך';
  const senderName = UNITS.find(u=>u.id===currentUnit)?.name || 'פיקוד';
  const task = {
    id:uid(), title,
    desc: document.getElementById('m-tdesc').value,
    priority: document.getElementById('m-tpri').value,
    status: 'todo', date: dateStr,
    assignedBy: senderName
  };
  if(targetId){
    STORE[targetId].tasks.push(task);
    STORE[targetId].log.unshift({text:`משימה חדשה מ${senderName}: "${title}"`, color:'purple', time:now()});
    const uName = UNITS.find(u=>u.id===targetId)?.name;
    toast(`משימה נשלחה ל${uName} ✅`,'green');
  } else {
    UNITS.filter(u=>!u.isAdmin).forEach(u=>{
      STORE[u.id].tasks.push({...task, id:uid()});
      STORE[u.id].log.unshift({text:`משימה חדשה מ${senderName}: "${title}"`, color:'purple', time:now()});
    });
    toast(`משימה נשלחה לכל היחידות ✅`,'green');
  }
  closeModal();
  if(document.getElementById('page-command').classList.contains('active')) renderCommand();
}

// ════════════ DISPATCH EQUIP ════════════
function openDispatchEquip(){
  const nonAdmin = UNITS.filter(u=>!u.isAdmin);
  openModal(`<div class="modal-title">📦 ניפוק ציוד ליחידה</div>
    <div class="form-row"><label class="form-label">יחידה יעד</label>
      <select class="form-input" id="m-du">
        ${nonAdmin.map(u=>`<option value="${u.id}">${u.name}</option>`).join('')}
      </select></div>
    <div class="form-row"><label class="form-label">פריט</label>
      <input class="form-input" id="m-ditem" placeholder='לדוג: הגדות פסח'></div>
    <div class="form-row"><label class="form-label">כמות שנופקה</label>
      <input class="form-input" type="number" id="m-dqty" value="1" min="1"></div>
    <div class="form-row"><label class="form-label">הערה</label>
      <input class="form-input" id="m-dnote" placeholder='אופציונלי'></div>
    <div class="modal-btns">
      <button class="btn ghost" onclick="closeModal()">ביטול</button>
      <button class="btn" onclick="saveDispatch()">אשר ניפוק</button>
    </div>`);
}

function saveDispatch(){
  const uid2 = document.getElementById('m-du').value;
  const item = document.getElementById('m-ditem').value.trim();
  const qty = +document.getElementById('m-dqty').value;
  const note = document.getElementById('m-dnote').value;
  if(!item) return;
  const uName = UNITS.find(u=>u.id===uid2)?.name;
  // Add to unit's equipment
  const existing = STORE[uid2].equipment.find(e=>e.name===item);
  if(existing){ existing.have += qty; }
  else { STORE[uid2].equipment.push({id:nextId++, name:item, cat:'ניפוק', have:qty, need:qty}); }
  const logEntry = {text:`נופק ל${uName}: ${item} × ${qty}${note?' — '+note:''}`, time:now()};
  DISPATCH_LOG.unshift(logEntry);
  STORE[uid2].log.unshift({text:`ניפוק התקבל: ${item} × ${qty}`, color:'blue', time:now()});
  toast(`ניפוק ${item} × ${qty} ל${uName} ✅`,'green');
  closeModal(); renderCommand();
}

// ════════════ MODALS ════════════
function openModal(html){ document.getElementById('modal-body').innerHTML=html; document.getElementById('overlay').classList.add('open'); }
function closeModal(){ document.getElementById('overlay').classList.remove('open'); }

function openAddPerson(){
  openModal(`<div class="modal-title">➕ הוספת איש צוות</div>
    <div class="form-grid">
      <div class="form-row"><label class="form-label">שם + דרגה</label><input class="form-input" id="m-name" placeholder='לדוג: סמ"ר כהן'></div>
      <div class="form-row"><label class="form-label">תפקיד</label>
        <select class="form-input" id="m-role">
          <option>מכשיר</option><option>ביינש</option><option>עורך סדר</option><option>קצ"ש</option><option>סגל</option>
        </select></div>
      <div class="form-row"><label class="form-label">סטטוס</label>
        <select class="form-input" id="m-status">
          <option value="available">זמין</option><option value="zoom">זום</option>
          <option value="away">הגב</option><option value="leave">שחרור</option>
        </select></div>
      <div class="form-row"><label class="form-label">הכשרה</label>
        <select class="form-input" id="m-tr">
          <option value="none">טרם</option><option value="active">בהכשרה</option><option value="done">הוכשר</option>
        </select></div>
    </div>
    <div class="modal-btns">
      <button class="btn ghost" onclick="closeModal()">ביטול</button>
      <button class="btn" onclick="savePerson()">הוסף</button>
    </div>`);
}
function savePerson(){
  const name=document.getElementById('m-name').value.trim();
  if(!name) return;
  const s=store();
  s.personnel.push({id:uid(),name,role:document.getElementById('m-role').value,
    status:document.getElementById('m-status').value,
    training_status:document.getElementById('m-tr').value,
    training_start:'',training_end:'',controllers_needed:0});
  addLog(`${name} נוסף לצוות`,'gold');
  toast(`${name} נוסף`,'green');
  closeModal(); renderPersonnel(); renderDashboard();
}

function openAddEquip(){
  openModal(`<div class="modal-title">📦 הוספת פריט ציוד</div>
    <div class="form-grid">
      <div class="form-row"><label class="form-label">שם הפריט</label><input class="form-input" id="m-ename"></div>
      <div class="form-row"><label class="form-label">קטגוריה</label>
        <select class="form-input" id="m-ecat"><option>כשרות</option><option>ניקיון</option><option>לוגיסטיקה</option></select></div>
      <div class="form-row"><label class="form-label">יש</label><input class="form-input" type="number" id="m-ehave" value="0"></div>
      <div class="form-row"><label class="form-label">נדרש</label><input class="form-input" type="number" id="m-eneed" value="10"></div>
    </div>
    <div class="modal-btns">
      <button class="btn ghost" onclick="closeModal()">ביטול</button>
      <button class="btn" onclick="saveEquip()">הוסף</button>
    </div>`);
}
function saveEquip(){
  const name=document.getElementById('m-ename').value.trim();
  if(!name) return;
  store().equipment.push({id:uid(),name,cat:document.getElementById('m-ecat').value,
    have:+document.getElementById('m-ehave').value,need:+document.getElementById('m-eneed').value});
  addLog(`${name} נוסף לציוד`,'blue');
  closeModal(); renderEquipment(); renderDashboard();
}

function openAddArea(){
  openModal(`<div class="modal-title">🧹 הוספת אזור ניקיון</div>
    <div class="form-row"><label class="form-label">שם האזור</label><input class="form-input" id="m-aname"></div>
    <div class="form-row"><label class="form-label">סטטוס</label>
      <select class="form-input" id="m-astatus"><option value="dirty">לא נוקה</option><option value="partial">בתהליך</option><option value="clean">נקי</option></select></div>
    <div class="modal-btns">
      <button class="btn ghost" onclick="closeModal()">ביטול</button>
      <button class="btn" onclick="saveArea()">הוסף</button>
    </div>`);
}
function saveArea(){
  const name=document.getElementById('m-aname').value.trim();
  if(!name) return;
  store().areas.push({id:uid(),name,status:document.getElementById('m-astatus').value});
  addLog(`אזור ${name} נוסף`,'blue');
  closeModal(); renderCleaning();
}

function openAddTask(){
  openModal(`<div class="modal-title">✅ משימה חדשה</div>
    <div class="form-row"><label class="form-label">כותרת</label><input class="form-input" id="m-tname"></div>
    <div class="form-row"><label class="form-label">תיאור</label><input class="form-input" id="m-tdesc"></div>
    <div class="form-grid">
      <div class="form-row"><label class="form-label">עדיפות</label>
        <select class="form-input" id="m-tpri"><option value="urgent">דחוף</option><option value="high">גבוה</option><option value="normal">בינוני</option></select></div>
      <div class="form-row"><label class="form-label">תאריך יעד</label><input class="form-input" id="m-tdate" type="date"></div>
    </div>
    <div class="modal-btns">
      <button class="btn ghost" onclick="closeModal()">ביטול</button>
      <button class="btn" onclick="saveTask()">הוסף</button>
    </div>`);
}
function saveTask(){
  const name=document.getElementById('m-tname').value.trim();
  if(!name) return;
  const d=document.getElementById('m-tdate').value;
  const dateStr=d?new Date(d).toLocaleDateString('he-IL'):'ללא תאריך';
  store().tasks.push({id:uid(),title:name,desc:document.getElementById('m-tdesc').value,
    priority:document.getElementById('m-tpri').value,status:'todo',date:dateStr});
  addLog(`משימה "${name}" נוספה`,'gold');
  closeModal(); renderTasks(); renderDashboard();
}

// ════════════ HELPERS ════════════
function addLog(text, color='gold'){
  const s = store();
  s.log.unshift({text, color, time: now()});
  if(s.log.length>30) s.log.pop();
}

function toast(msg, type='gold'){
  const el=document.getElementById('toast');
  el.textContent=msg; el.className=`toast ${type} show`;
  setTimeout(()=>el.classList.remove('show'), 2800);
}

// ════════════ ADD UNIT (ADMIN) ════════════
function openAddUnitAdmin(){
  openModal(`<div class="modal-title">➕ הוספת יחידה לפיקוד</div>
    <div class="form-row"><label class="form-label">שם היחידה</label><input class="form-input" id="m-uname" placeholder='לדוג: חטמ"ר גלבוע'></div>
    <div class="form-row"><label class="form-label">סמל / אייקון</label>
      <select class="form-input" id="m-uicon">
        <option value="🛡">🛡 חטמ"ר</option>
        <option value="⚔">⚔ חטיבה</option>
        <option value="🎖">🎖 אוגדה</option>
        <option value="🏛">🏛 אחר</option>
      </select></div>
    <div class="modal-btns">
      <button class="btn ghost" onclick="closeModal()">ביטול</button>
      <button class="btn" onclick="saveNewUnitAdmin()">הוסף יחידה</button>
    </div>`);
}

function saveNewUnitAdmin(){
  const name = document.getElementById('m-uname').value.trim();
  if(!name) return alert('נא הכנס שם יחידה');
  const icon = document.getElementById('m-uicon').value;
  const newId = 'unit_' + Date.now();
  UNITS.splice(UNITS.length-1, 0, { id: newId, name, icon, brigade:'פיקוד מרכז', isAdmin:false });
  STORE[newId] = {
    personnel:[], equipment:[], areas:[], tasks:[], log:[],
    controllers_needed:2, trainers:1, beinashim:2,
    seder_editor:'—', training_status:'none', training_start:'', training_end:'', clean_pct:0,
  };
  STORE[newId].log.push({text:`יחידה ${name} נוצרה`, color:'gold', time: now()});
  addLog(`יחידה חדשה נוספה: ${name}`, 'gold');
  toast(`${name} נוספה לפיקוד! ✅`, 'green');
  closeModal();
  renderCommand();
}

// ════════════ INIT ════════════
renderLogin();
</script>
</body>
</html>
