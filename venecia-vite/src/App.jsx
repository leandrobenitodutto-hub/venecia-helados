import { useState, useEffect } from "react";
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://eusshllmrdwsudpskglz.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1c3NobGxtcmR3c3VkcHNrZ2x6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2MzkxNDAsImV4cCI6MjA5MjIxNTE0MH0.Z9Istp3XQJJU82Djmjau4qsARNgUWx9W2TsuTrKZv3k'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ── Helpers de base de datos ──────────────────────────────────────────────────

async function cargarTodasLasVentas() {
  const PAGINA = 1000;
  let todas = [];
  let desde = 0;
  while (true) {
    const { data, error } = await supabase
      .from('ventas')
      .select('*')
      .order('id')
      .range(desde, desde + PAGINA - 1);
    if (error || !data || data.length === 0) break;
    todas = todas.concat(data);
    if (data.length < PAGINA) break;
    desde += PAGINA;
  }
  return todas;
}

async function cargarDatos() {
  const [
    { data: sucursales },
    { data: usuarios },
    { data: productos },
    { data: insumos },
    { data: cajas },
    { data: retiros },
    { data: consumosEmpleado },
    ventas,
  ] = await Promise.all([
    supabase.from('sucursales').select('*').order('id'),
    supabase.from('usuarios').select('*').order('id'),
    supabase.from('productos').select('*').order('id'),
    supabase.from('insumos').select('*').order('id'),
    supabase.from('cajas').select('*').order('id'),
    supabase.from('retiros').select('*').order('id'),
    supabase.from('consumos_empleado').select('*').order('id'),
    cargarTodasLasVentas(),
  ])

  return {
    sucursales: sucursales || [],
    usuarios: usuarios || [],
    productos: (productos || []).map(p => ({
      ...p,
      stockKg: p.stock_kg,
      tipoCosto: p.tipo_costo,
    })),
    insumos: insumos || [],
    cajas: (cajas || []).map(function(c) { return {
      ...c,
      usuarioNombre: c.usuario_nombre,
      sucursalNombre: c.sucursal_nombre,
      horaApertura: c.hora_apertura,
      horaCierre: c.hora_cierre,
      montoInicial: c.monto_inicial || 0,
    }; }),
    ventas: (ventas || []).map(v => ({
      ...v,
      sucursal_id: v.sucursal_id,
      usuario_id: v.usuario_id,
      usuario_nombre: v.usuario_nombre,
      costo_total: v.costo_total,
      formaPago: v.forma_pago,
      cajaId: v.caja_id,
    })),
    retiros: (retiros || []).map(r => ({
      ...r,
      cajaId: r.caja_id,
      usuarioId: r.usuario_id,
      usuarioNombre: r.usuario_nombre,
      sucursalNombre: r.sucursal_nombre,
    })),
    consumosEmpleado: (consumosEmpleado || []).map(c => ({
      ...c,
      cajaId: c.caja_id,
      usuarioId: c.usuario_id,
      usuarioNombre: c.usuario_nombre,
      sucursalNombre: c.sucursal_nombre,
    })),
  }
}

async function guardarVenta(venta) {
  await supabase.from('ventas').insert({
    id: venta.id,
    caja_id: venta.cajaId,
    fecha: venta.fecha,
    hora: venta.hora,
    sucursal_id: venta.sucursal_id,
    usuario_id: venta.usuario_id,
    usuario_nombre: venta.usuario_nombre,
    items: venta.items,
    total: venta.total,
    costo_total: venta.costo_total,
    forma_pago: venta.formaPago,
    recibido: venta.recibido,
    vuelto: venta.vuelto,
    editada: false,
  })
}

async function actualizarVenta(id, cambios) {
  await supabase.from('ventas').update({
    items: cambios.items,
    forma_pago: cambios.formaPago,
    total: cambios.total,
    costo_total: cambios.costo_total,
    editada: true,
  }).eq('id', id)
}

async function guardarCaja(caja) {
  await supabase.from('cajas').insert({
    id: caja.id,
    usuario_id: caja.usuarioId,
    usuario_nombre: caja.usuarioNombre,
    sucursal_id: caja.sucursalId,
    sucursal_nombre: caja.sucursalNombre,
    fecha: caja.fecha,
    hora_apertura: caja.horaApertura,
    hora_cierre: null,
    monto_inicial: caja.montoInicial,
    cerrada: false,
  })
}

async function cerrarCaja(id, horaCierre) {
  var result = await supabase.from('cajas').update({
    hora_cierre: horaCierre,
    cerrada: true,
  }).eq('id', Number(id));
  console.log('cerrarCaja result:', result, 'id:', id);
  return result;
}

async function guardarRetiro(retiro) {
  await supabase.from('retiros').insert({
    id: retiro.id,
    caja_id: retiro.cajaId,
    fecha: retiro.fecha,
    hora: retiro.hora,
    usuario_id: retiro.usuarioId,
    usuario_nombre: retiro.usuarioNombre,
    sucursal_nombre: retiro.sucursalNombre,
    motivo: retiro.motivo,
    monto: retiro.monto,
  })
}

async function guardarConsumo(consumo) {
  await supabase.from('consumos_empleado').insert({
    id: consumo.id,
    fecha: consumo.fecha,
    hora: consumo.hora,
    usuario_id: consumo.usuarioId,
    usuario_nombre: consumo.usuarioNombre,
    sucursal_nombre: consumo.sucursalNombre,
    caja_id: consumo.cajaId,
    items: consumo.items,
    total: consumo.total,
  })
}

async function guardarProducto(producto) {
  const data = {
    nombre: producto.nombre,
    precio: producto.precio,
    costo: producto.costo,
    stock_kg: producto.stockKg || 0,
    emoji: producto.emoji,
    categoria: producto.categoria,
    tipo_costo: producto.tipoCosto,
    receta: producto.receta || [],
    activo: producto.activo,
  }
  if (producto.id && !String(producto.id).startsWith('new')) {
    await supabase.from('productos').update(data).eq('id', producto.id)
  } else {
    const { data: nuevo } = await supabase.from('productos').insert(data).select().single()
    return nuevo
  }
}

async function guardarInsumo(insumo) {
  if (insumo.id) {
    await supabase.from('insumos').update({ nombre: insumo.nombre, costo: insumo.costo }).eq('id', insumo.id)
  } else {
    const { data: nuevo } = await supabase.from('insumos').insert({ nombre: insumo.nombre, costo: insumo.costo }).select().single()
    return nuevo
  }
}

async function eliminarInsumo(id) {
  await supabase.from('insumos').delete().eq('id', id)
}

async function guardarUsuario(usuario) {
  const data = {
    nombre: usuario.nombre,
    clave: usuario.clave,
    rol: usuario.rol,
    sucursal_id: usuario.sucursal_id || null,
  }
  if (usuario.id) {
    await supabase.from('usuarios').update(data).eq('id', usuario.id)
  } else {
    const { data: nuevo } = await supabase.from('usuarios').insert(data).select().single()
    return nuevo
  }
}

async function eliminarUsuario(id) {
  await supabase.from('usuarios').delete().eq('id', id)
}

async function eliminarVenta(id) {
  await supabase.from('ventas').delete().eq('id', id)
}

async function eliminarRetiro(id) {
  await supabase.from('retiros').delete().eq('id', id)
}

async function actualizarRetiro(id, cambios) {
  await supabase.from('retiros').update({
    motivo: cambios.motivo,
    monto: cambios.monto,
  }).eq('id', id)
}

async function eliminarConsumo(id) {
  await supabase.from('consumos_empleado').delete().eq('id', id)
}


// ─── PALETA VENECIA ──────────────────────────────────────────────────────────
const C = {
  violeta: "#5B2D8E",
  violetaMed: "#7B4BB8",
  violetaLight: "#C4A8E0",
  violetaPale: "#EDE4F7",
  amarillo: "#F5C842",
  amarilloLight: "#FFF0A0",
  rosa: "#F7B7CC",
  rosaPale: "#FDE8F0",
  menta: "#A8DDD1",
  mentaPale: "#D6F3EE",
  crema: "#FFF8EE",
  beige: "#F5EDD8",
  dark: "#2D1559",
  blanco: "#FFFFFF",
};

const MOBILE_TABLE_CSS = `
  @media (max-width: 767px) {
    table { display: block; overflow-x: auto; -webkit-overflow-scrolling: touch; }
  }
`;

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Baloo+2:wght@700;800&display=swap');`;

const PRINT_STYLES = `
@media print {
  /* Ocultar todo excepto el ticket */
  body * { visibility: hidden !important; }
  #ticket-print, #ticket-print * { visibility: visible !important; }
  #ticket-print {
    position: fixed !important;
    left: 0 !important;
    top: 0 !important;
    width: 76mm !important;
  }

  @page {
    width: 80mm;
    margin: 0;
    padding: 0;
  }

  #ticket-print {
    display: block;
    width: 76mm;
    margin: 0 auto;
    padding: 4mm 2mm;
    font-family: 'Courier New', Courier, monospace !important;
    font-size: 11px !important;
    color: #000 !important;
    background: #fff !important;
  }

  #ticket-print * {
    font-family: 'Courier New', Courier, monospace !important;
    color: #000 !important;
    background: transparent !important;
    border-radius: 0 !important;
    box-shadow: none !important;
  }

  #ticket-print .ticket-title {
    font-size: 16px !important;
    font-weight: bold !important;
    text-align: center;
    letter-spacing: 3px;
  }

  #ticket-print .ticket-subtitle {
    font-size: 10px !important;
    text-align: center;
    margin-bottom: 2mm;
  }

  #ticket-print .ticket-divider {
    border: none;
    border-top: 1px dashed #000;
    margin: 2mm 0;
  }

  #ticket-print .ticket-row {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    margin: 1mm 0;
  }

  #ticket-print .ticket-row-bold {
    display: flex;
    justify-content: space-between;
    font-size: 13px !important;
    font-weight: bold !important;
    margin: 2mm 0;
  }

  #ticket-print .ticket-total {
    font-size: 15px !important;
    font-weight: bold !important;
    text-align: center;
    margin: 2mm 0;
    border-top: 1px solid #000;
    border-bottom: 1px solid #000;
    padding: 1mm 0;
  }

  #ticket-print .ticket-center {
    text-align: center;
    font-size: 10px;
  }

  #ticket-print .ticket-highlight {
    border: 1px solid #000;
    padding: 1mm 2mm;
    margin: 1mm 0;
    font-weight: bold;
  }
}
`;

// ─── DATOS INICIALES ──────────────────────────────────────────────────────────
const INITIAL_DATA = {
  sucursales: [
    { id: 1, nombre: "Venecia Sarmiento" },
    { id: 2, nombre: "Venecia Shopping" },
  ],
  usuarios: [
    { id: 1, nombre: "Valentina López", clave: "1234", rol: "empleada", sucursal_id: 1 },
    { id: 2, nombre: "Sofía Martínez", clave: "5678", rol: "empleada", sucursal_id: 2 },
    { id: 3, nombre: "Admin", clave: "admin123", rol: "admin", sucursal_id: null },
  ],
  productos: [
    // ── PRODUCTOS ──
    { id: 1,  nombre: "1 Kg",                    precio: 20000, costo: 8184,  stockKg: 1.00, emoji: "🍨", categoria: "productos", activo: true },
    { id: 2,  nombre: "3/4 Kg",                  precio: 17000, costo: 6336,  stockKg: 0.75, emoji: "🍨", categoria: "productos", activo: true },
    { id: 3,  nombre: "1/2 Kg",                  precio: 12000, costo: 4240,  stockKg: 0.50, emoji: "🍨", categoria: "productos", activo: true },
    { id: 4,  nombre: "1/4 Kg",                  precio: 8000,  costo: 2081,  stockKg: 0.25, emoji: "🍨", categoria: "productos", activo: true },
    { id: 5,  nombre: "Chico",                   precio: 3500,  costo: 834,   stockKg: 0.10, emoji: "🍦", categoria: "productos", activo: true },
    { id: 6,  nombre: "Mediano",                 precio: 5000,  costo: 1582,  stockKg: 0.20, emoji: "🍦", categoria: "productos", activo: true },
    { id: 7,  nombre: "Grande",                  precio: 6000,  costo: 2314,  stockKg: 0.30, emoji: "🍦", categoria: "productos", activo: true },
    { id: 8,  nombre: "Bañado",                  precio: 1000,  costo: 149,   stockKg: 0.00, emoji: "🍫", categoria: "productos", activo: true },
    { id: 9,  nombre: "Batido",                  precio: 7000,  costo: 2080,  stockKg: 0.20, emoji: "🥛", categoria: "productos", activo: true },
    { id: 10, nombre: "Copa Helada",             precio: 7500,  costo: 2000,  stockKg: 0.00, emoji: "🏆", categoria: "productos", activo: true },
    { id: 12, nombre: "Bombon Escoces",          precio: 6000,  costo: 2000,  stockKg: 0.00, emoji: "🍬", categoria: "productos", activo: true },
    { id: 13, nombre: "Bombon Venecia",          precio: 6000,  costo: 2000,  stockKg: 0.00, emoji: "🍬", categoria: "productos", activo: true },
    { id: 14, nombre: "Bombon Suizo",            precio: 6000,  costo: 2000,  stockKg: 0.00, emoji: "🍬", categoria: "productos", activo: true },
    { id: 15, nombre: "Casatta",                 precio: 4500,  costo: 2000,  stockKg: 0.00, emoji: "🍰", categoria: "productos", activo: true },
    { id: 16, nombre: "Paletas De Crema",        precio: 5000,  costo: 2250,  stockKg: 0.00, emoji: "🍭", categoria: "productos", activo: true },
    { id: 17, nombre: "Smoothies",               precio: 4000,  costo: 2057,  stockKg: 0.00, emoji: "🥤", categoria: "productos", activo: true },
    // ── PROMOS ──
    { id: 19, nombre: "Promo Lunes 2x1/4",       precio: 12000, costo: 4163,  stockKg: 0.50, emoji: "⭐", categoria: "promos", activo: true },
    { id: 20, nombre: "Promo Martes 1 Kg",       precio: 18000, costo: 8184,  stockKg: 1.00, emoji: "⭐", categoria: "promos", activo: true },
    { id: 29, nombre: "Promo 1Kg Limón 50%",     precio: 9000,  costo: 1000,  stockKg: 1.00, emoji: "🍋", categoria: "promos", activo: true },
    { id: 31, nombre: "Batido 2x1 San Valentín", precio: 7000,  costo: 4160,  stockKg: 0.40, emoji: "❤️", categoria: "promos", activo: true },
    { id: 32, nombre: "Promo Bombones x6",       precio: 30000, costo: 12000, stockKg: 0.00, emoji: "🎁", categoria: "promos", activo: true },
    { id: 33, nombre: "Oferta 2x1 1 Bocha",      precio: 3500,  costo: 1668,  stockKg: 0.20, emoji: "⚡", categoria: "promos", activo: true },
    { id: 34, nombre: "Promo 2x1 1 Bocha Shop",  precio: 3500,  costo: 1668,  stockKg: 0.20, emoji: "⚡", categoria: "promos", activo: true },
    // ── PEDIDO YA ──
    { id: 22, nombre: "1 Kg",                    precio: 25000, costo: 15684, stockKg: 1.00, emoji: "📦", categoria: "pedidoya", activo: true },
    { id: 23, nombre: "3/4 Kg",                  precio: 21000, costo: 12636, stockKg: 0.75, emoji: "📦", categoria: "pedidoya", activo: true },
    { id: 24, nombre: "1/2 Kg",                  precio: 14000, costo: 8440,  stockKg: 0.50, emoji: "📦", categoria: "pedidoya", activo: true },
    { id: 25, nombre: "1/4 Kg",                  precio: 9000,  costo: 4781,  stockKg: 0.25, emoji: "📦", categoria: "pedidoya", activo: true },
    { id: 26, nombre: "Bombon Escoces",          precio: 7500,  costo: 4250,  stockKg: 0.00, emoji: "🍬", categoria: "pedidoya", activo: true },
    { id: 27, nombre: "Bombon Venecia",          precio: 7500,  costo: 4250,  stockKg: 0.00, emoji: "🍬", categoria: "pedidoya", activo: true },
    { id: 28, nombre: "Bombon Suizo",            precio: 7500,  costo: 4250,  stockKg: 0.00, emoji: "🍬", categoria: "pedidoya", activo: true },
  ],
  ventas: [],
  cajas: [],
  retiros: [],
  consumosEmpleado: [],
  insumos: [
    { id: 1, nombre: "Helado (por kg)", costo: 8184 },
    { id: 2, nombre: "Pote telgopor chico", costo: 200 },
    { id: 3, nombre: "Pote telgopor grande", costo: 350 },
    { id: 4, nombre: "Bolsa", costo: 80 },
    { id: 5, nombre: "Cucharita", costo: 30 },
    { id: 6, nombre: "Servilleta", costo: 15 },
    { id: 7, nombre: "Cucurucho", costo: 120 },
    { id: 8, nombre: "Vaso descartable", costo: 90 },
  ],
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const fmt = (n) => `$${Number(n).toLocaleString("es-AR")}`;
const hoy = () => {
  var d = new Date();
  return d.toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });
};
const ahora = () => new Date().toLocaleTimeString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", hour: "2-digit", minute: "2-digit", hour12: false });
const fechaLegible = (iso) => new Date(iso + "T00:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });

// Filtra ventas por rango DESDE fecha+hora HASTA fecha+hora (datetime continuo)
const filtrarPorHora = (ventas, horaDesde, horaHasta, desde, hasta) => {
  if (!horaDesde && !horaHasta) return ventas;
  // Combina fecha+hora en un string comparable "YYYY-MM-DD HH:MM"
  const toMin = (fecha, hora) => fecha + " " + (hora || "00:00").slice(0, 5);
  const desdeDT = toMin(desde, horaDesde || "00:00");
  const hastaDT = toMin(hasta, horaHasta || "23:59");
  return ventas.filter(v => {
    const vDT = toMin(v.fecha || "0000-00-00", v.hora || "00:00");
    return vDT >= desdeDT && vDT <= hastaDT;
  });
};

// Calcula el costo de un producto según su tipo (fijo o receta)
const calcularCosto = (producto, insumos) => {
  if (!producto) return 0;
  if (producto.tipoCosto === "receta" && producto.receta && producto.receta.length > 0) {
    return producto.receta.reduce((total, linea) => {
      const insumo = insumos.find(i => i.id === linea.insumoId);
      if (!insumo) return total;
      return total + (insumo.costo * linea.cantidad);
    }, 0);
  }
  return producto.costo || 0;
};

// ─── BLOB ORGÁNICO (decoración) ───────────────────────────────────────────────
const Blob = ({ color, style }) => (
  <div style={{
    background: color, borderRadius: "60% 40% 70% 30% / 50% 60% 40% 70%",
    position: "absolute", opacity: 0.35, pointerEvents: "none", ...style
  }} />
);

// ─── LOGO ─────────────────────────────────────────────────────────────────────
const Logo = ({ size = 40, dark = false }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: dark ? C.violeta : C.blanco,
      display: "flex", alignItems: "center", justifyContent: "center",
      boxShadow: `0 3px 12px rgba(91,45,142,0.25)`,
      flexShrink: 0,
    }}>
      <span style={{ fontSize: size * 0.5 }}>🍦</span>
    </div>
    <div>
      <div style={{
        fontFamily: "Baloo 2, cursive", fontWeight: 800,
        fontSize: size * 0.55, color: dark ? C.blanco : C.violeta,
        lineHeight: 1, letterSpacing: 1
      }}>Venecia</div>
      <div style={{ fontSize: size * 0.22, color: dark ? "rgba(255,255,255,0.6)" : C.violetaMed, fontFamily: "Nunito, sans-serif", fontWeight: 600, letterSpacing: 1 }}>
        HELADOS ARTESANALES
      </div>
    </div>
  </div>
);

// ─── HELPER IMPRIMIR ─────────────────────────────────────────────────────────
function imprimirTicket() {
  window.print();
}

function imprimirHTML(html) {
  var iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);
  var doc = iframe.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();
  iframe.contentWindow.focus();
  setTimeout(function() {
    iframe.contentWindow.print();
    setTimeout(function() { document.body.removeChild(iframe); }, 1000);
  }, 500);
}

// ─── TICKET CLIENTE (comanda) ─────────────────────────────────────────────────
function TicketModal({ venta, sucursal, usuario, onClose }) {
  if (!venta) return null;
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(45,21,89,0.75)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:20 }}>
      <style>{PRINT_STYLES}</style>

      {/* Versión pantalla (bonita) */}
      <div style={{ background:C.blanco, padding:"28px 24px", borderRadius:20, maxWidth:340, width:"100%", fontFamily:"Nunito, sans-serif", boxShadow:`0 24px 60px rgba(91,45,142,0.35)`, position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:-20, right:-20, width:80, height:80, borderRadius:"50%", background:C.violetaPale }} />
        <div style={{ position:"absolute", bottom:-15, left:-15, width:60, height:60, borderRadius:"50%", background:C.amarilloLight }} />
        <div style={{ textAlign:"center", borderBottom:`2px dashed ${C.violetaLight}`, paddingBottom:14, marginBottom:14, position:"relative" }}>
          <Logo size={44} />
          <div style={{ marginTop:8, fontSize:12, color:C.violetaMed, fontWeight:600 }}>{sucursal}</div>
          <div style={{ fontSize:11, color:"#aaa", marginTop:2 }}>{fechaLegible(venta.fecha)} · {venta.hora} · {usuario}</div>
          <div style={{ fontSize:11, color:"#bbb" }}>Ticket #{String(venta.id).slice(-5).padStart(5,"0")}</div>
        </div>
        <table style={{ width:"100%", fontSize:13, borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ borderBottom:`1px solid ${C.violetaPale}` }}>
              <th style={{ textAlign:"left", paddingBottom:6, color:C.violeta, fontWeight:800 }}>Producto</th>
              <th style={{ textAlign:"center", color:C.violeta, fontWeight:800 }}>Cant</th>
              <th style={{ textAlign:"right", color:C.violeta, fontWeight:800 }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {venta.items.map((item,i) => (
              <tr key={i} style={{ borderBottom:`1px solid ${C.crema}` }}>
                <td style={{ padding:"5px 0", fontWeight:600 }}>{item.nombre}</td>
                <td style={{ textAlign:"center", color:C.violetaMed }}>{item.cantidad}</td>
                <td style={{ textAlign:"right", fontWeight:700 }}>{fmt(item.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ borderTop:`2px dashed ${C.violetaLight}`, marginTop:12, paddingTop:12 }}>
          <div style={{ display:"flex", justifyContent:"space-between", fontWeight:900, fontSize:18, color:C.violeta, marginBottom:6 }}>
            <span>TOTAL</span><span>{fmt(venta.total)}</span>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, color:"#777", marginBottom:3 }}>
            <span>Forma de pago</span>
            <span style={{ fontWeight:700 }}>
              {venta.formaPago === "mixto" ? "Pago mixto" : venta.formaPago === "efectivo" ? "Efectivo" : venta.formaPago === "tarjeta" ? "Tarjeta" : venta.formaPago === "qr" ? "QR" : "Consumo"}
            </span>
          </div>
          {venta.pagosMixtos && venta.pagosMixtos.map(function(p,i) {
            var lb = {efectivo:"💵 Efectivo", tarjeta:"💳 Tarjeta", qr:"📱 QR"};
            return (
              <div key={i} style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#888", marginBottom:2 }}>
                <span>{lb[p.medio]||p.medio}</span><span style={{ fontWeight:700 }}>{fmt(Number(p.monto))}</span>
              </div>
            );
          })}
          {venta.formaPago === "efectivo" && venta.vuelto > 0 && (
            <div style={{ background:C.mentaPale, borderRadius:10, padding:"8px 12px", marginTop:6 }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:13 }}>
                <span>Recibido</span><span>{fmt(venta.recibido)}</span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", fontWeight:900, color:"#2a7a5e", fontSize:15 }}>
                <span>Vuelto</span><span>{fmt(venta.vuelto)}</span>
              </div>
            </div>
          )}
        </div>
        <div style={{ textAlign:"center", marginTop:14, fontSize:12, color:C.violetaLight, fontWeight:700 }}>
          Gracias por elegirnos! Venecia Helados
        </div>
        <div style={{ display:"flex", gap:10, marginTop:16 }}>
          <button onClick={onClose} style={{ flex:1, padding:"12px", background:C.violetaPale, color:C.violeta, border:"none", borderRadius:14, cursor:"pointer", fontWeight:800, fontSize:14, fontFamily:"Nunito, sans-serif" }}>
            Cerrar
          </button>
          <button onClick={imprimirTicket} style={{ flex:2, padding:"12px", background:C.violeta, color:C.blanco, border:"none", borderRadius:14, cursor:"pointer", fontWeight:800, fontSize:14, fontFamily:"Nunito, sans-serif" }}>
            🖨️ Imprimir
          </button>
        </div>
      </div>

      {/* Versión impresión térmica (oculta en pantalla, visible al imprimir) */}
      <div id="ticket-print" style={{ display:"none" }}>
        <div className="ticket-title">VENECIA</div>
        <div className="ticket-subtitle">Helados Artesanales</div>
        <div className="ticket-subtitle">{sucursal}</div>
        <hr className="ticket-divider" />
        <div className="ticket-subtitle">{fechaLegible(venta.fecha)} {venta.hora}</div>
        <div className="ticket-subtitle">Atendio: {usuario}</div>
        <div className="ticket-subtitle">Ticket #{String(venta.id).slice(-5).padStart(5,"0")}</div>
        <hr className="ticket-divider" />
        {venta.items.map((item,i) => (
          <div key={i}>
            <div style={{ fontWeight:"bold" }}>{item.nombre}</div>
            <div className="ticket-row">
              <span>{item.cantidad} x {fmt(item.precio)}</span>
              <span>{fmt(item.subtotal)}</span>
            </div>
          </div>
        ))}
        <hr className="ticket-divider" />
        <div className="ticket-total">TOTAL: {fmt(venta.total)}</div>
        <div className="ticket-row">
          <span>Forma de pago:</span>
          <span>{venta.formaPago === "efectivo" ? "Efectivo" : venta.formaPago === "tarjeta" ? "Tarjeta/Debito" : "QR/Transferencia"}</span>
        </div>
        {venta.formaPago === "efectivo" && venta.vuelto > 0 && (
          <>
            <div className="ticket-row"><span>Recibido:</span><span>{fmt(venta.recibido)}</span></div>
            <div className="ticket-row-bold"><span>VUELTO:</span><span>{fmt(venta.vuelto)}</span></div>
          </>
        )}
        <hr className="ticket-divider" />
        <div className="ticket-center">Gracias por elegirnos!</div>
        <div className="ticket-center">Venecia Helados Artesanales</div>
        <div className="ticket-center"> </div>
        <div className="ticket-center"> </div>
        <div className="ticket-center"> </div>
      </div>
    </div>
  );
}


// ─── TICKET CIERRE DE CAJA ────────────────────────────────────────────────────
function TicketCierre({ caja, sucursal, onClose }) {
  if (!caja) return null;
  const efectivo   = caja.ventas.filter(v => v.formaPago === "efectivo").reduce((s,v) => s + v.total, 0);
  const tarjeta    = caja.ventas.filter(v => v.formaPago === "tarjeta").reduce((s,v) => s + v.total, 0);
  const qr         = caja.ventas.filter(v => v.formaPago === "qr").reduce((s,v) => s + v.total, 0);
  const total      = caja.ventas.reduce((s,v) => s + v.total, 0);
  const cantVentas = caja.ventas.length;
  const efectivoFisico = efectivo + (caja.montoInicial || 0);

  var consumoCierre = caja.ventas.filter(function(v){return v.formaPago==="consumo";}).reduce(function(s,v){return s+v.total;},0);
  var retirosCierre = (caja.retiros || []);
  var totalRetirosCierre = retirosCierre.reduce(function(s,r){return s+r.monto;},0);
  const filasPago = [
    { label:"Efectivo (ventas)", value:efectivo },
    { label:"Tarjeta / Debito", value:tarjeta },
    { label:"QR / Transferencia", value:qr },
    { label:"Consumo empleado", value:consumoCierre },
  ];

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(45,21,89,0.8)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:20 }}>
      <style>{PRINT_STYLES}</style>

      {/* Versión pantalla */}
      <div style={{ background:"#fff", borderRadius:20, padding:"28px 24px", maxWidth:360, width:"100%", fontFamily:"Nunito, sans-serif", boxShadow:"0 24px 60px rgba(91,45,142,0.4)" }}>
        <div style={{ textAlign:"center", borderBottom:`2px dashed ${C.violetaLight}`, paddingBottom:14, marginBottom:14 }}>
          <Logo size={44} />
          <div style={{ marginTop:8, fontSize:15, fontWeight:900, color:C.violeta }}>CIERRE DE CAJA</div>
          <div style={{ fontSize:12, color:"#888", marginTop:4 }}>{sucursal}</div>
          <div style={{ fontSize:12, color:"#aaa" }}>{fechaLegible(caja.fecha)} · Turno #{String(caja.id).slice(-4)}</div>
          <div style={{ fontSize:13, fontWeight:800, color:C.dark, marginTop:4 }}>{caja.usuarioNombre}</div>
          <div style={{ fontSize:11, color:"#aaa" }}>Apertura: {caja.horaApertura} · Cierre: {caja.horaCierre}</div>
        </div>
        <div style={{ marginBottom:12 }}>
          <div style={{ fontSize:11, color:C.violetaMed, fontWeight:800, textTransform:"uppercase", letterSpacing:1, marginBottom:8 }}>Detalle por forma de pago</div>
          {[
            { label:"💵 Efectivo", value:efectivo, bg:C.mentaPale, color:"#2a7a5e" },
            { label:"💳 Tarjeta / Débito", value:tarjeta, bg:"#e8f0fe", color:"#2d5fa8" },
            { label:"📱 QR / Transferencia", value:qr, bg:C.violetaPale, color:C.violeta },
          ].map((row,i) => (
            <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"9px 12px", background:row.bg, borderRadius:10, marginBottom:6 }}>
              <span style={{ fontWeight:700, fontSize:13 }}>{row.label}</span>
              <span style={{ fontWeight:900, fontSize:15, color:row.color }}>{fmt(row.value)}</span>
            </div>
          ))}
        </div>
        <div style={{ borderTop:`2px dashed ${C.violetaLight}`, paddingTop:12, marginBottom:4 }}>
          <div style={{ display:"flex", justifyContent:"space-between", fontWeight:900, fontSize:17, color:C.violeta }}>
            <span>TOTAL CAJA</span><span>{fmt(total)}</span>
          </div>
          <div style={{ fontSize:12, color:"#aaa", marginTop:4 }}>{cantVentas} venta{cantVentas !== 1 ? "s" : ""} realizadas{caja.montoInicial > 0 ? ` · Fondo inicial: ${fmt(caja.montoInicial)}` : ""}</div>
          {caja.montoInicial > 0 && (
            <div style={{ display:"flex", justifyContent:"space-between", fontWeight:800, fontSize:14, color:"#27ae60", marginTop:6, background:C.mentaPale, padding:"8px 12px", borderRadius:10 }}>
              <span>💵 Efectivo físico total</span>
              <span>{fmt(efectivoFisico)}</span>
            </div>
          )}
        </div>
        <div style={{ textAlign:"center", fontSize:11, color:C.violetaLight, fontWeight:700, margin:"12px 0 16px" }}>
          Venecia Helados Artesanales
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onClose} style={{ flex:1, padding:"12px", borderRadius:14, border:"none", background:C.violetaPale, color:C.violeta, fontWeight:800, fontSize:14, cursor:"pointer", fontFamily:"Nunito, sans-serif" }}>
            Cerrar
          </button>
          <button onClick={imprimirTicket} style={{ flex:2, padding:"12px", borderRadius:14, border:"none", background:C.violeta, color:"#fff", fontWeight:800, fontSize:14, cursor:"pointer", fontFamily:"Nunito, sans-serif" }}>
            🖨️ Imprimir
          </button>
        </div>
      </div>

      {/* Versión impresión térmica */}
      <div id="ticket-print-hidden" style={{ display:"none" }}>
        <div className="ticket-title">VENECIA</div>
        <div className="ticket-subtitle">Helados Artesanales</div>
        <div className="ticket-subtitle">{sucursal}</div>
        <hr className="ticket-divider" />
        <div className="ticket-title" style={{ fontSize:13 }}>CIERRE DE CAJA</div>
        <div className="ticket-subtitle">Turno #{String(caja.id).slice(-4)}</div>
        <div className="ticket-subtitle">{fechaLegible(caja.fecha)}</div>
        <div className="ticket-subtitle">Empleada: {caja.usuarioNombre}</div>
        <div className="ticket-subtitle">Apertura: {caja.horaApertura}  Cierre: {caja.horaCierre}</div>
        <hr className="ticket-divider" />
        <div style={{ fontWeight:"bold", fontSize:11 }}>DETALLE POR FORMA DE PAGO:</div>
        {filasPago.map((f,i) => (
          <div key={i} className="ticket-row">
            <span>{f.label}</span><span>{fmt(f.value)}</span>
          </div>
        ))}
        <hr className="ticket-divider" />
        {caja.montoInicial > 0 && (
          <div className="ticket-row"><span>Fondo inicial:</span><span>{fmt(caja.montoInicial)}</span></div>
        )}
        <div className="ticket-total">TOTAL CAJA: {fmt(total)}</div>
        {caja.montoInicial > 0 && (
          <div className="ticket-highlight">
            <div className="ticket-row-bold"><span>EFECTIVO FISICO EN CAJA:</span><span>{fmt(efectivoFisico)}</span></div>
          </div>
        )}
        <hr className="ticket-divider" />
        <div className="ticket-center">{cantVentas} ventas realizadas en el turno</div>
        <hr className="ticket-divider" />
        <div className="ticket-center">Venecia Helados Artesanales</div>
        <div className="ticket-center"> </div>
        <div className="ticket-center"> </div>
        <div className="ticket-center"> </div>
      </div>
    </div>
  );
}

// ─── APERTURA DE CAJA ─────────────────────────────────────────────────────────
function AperturaCaja({ sesion, onAbrir, data }) {
  const [monto, setMonto] = useState("");

  // Verificar si hay otra caja abierta en esta sucursal (de otro usuario)
  var cajaOtraPersona = data.cajas.find(function(c) {
    return (c.cerrada === false || c.cerrada === null || c.cerrada === 0) 
      && c.sucursal_id === sesion.sucursal.id 
      && c.usuario_id !== sesion.usuario.id;
  });

  const abrir = function() {
    onAbrir(Number(monto) || 0);
  };

  if (cajaOtraPersona) {
    return (
      <div style={{ minHeight:"100vh", background:C.violeta, display:"flex", alignItems:"center", justifyContent:"center", padding:20, fontFamily:"Nunito, sans-serif" }}>
        <style>{FONTS}</style>
        <div style={{ background:C.blanco, borderRadius:24, padding:"40px 32px", maxWidth:380, width:"100%", textAlign:"center", boxShadow:"0 24px 60px rgba(0,0,0,0.3)" }}>
          <div style={{ fontSize:60, marginBottom:16 }}>🔒</div>
          <h2 style={{ color:C.violeta, fontFamily:"Baloo 2, cursive", margin:"0 0 12px" }}>Caja ocupada</h2>
          <p style={{ color:"#666", fontSize:14, lineHeight:1.6, marginBottom:20 }}>
            <strong>{cajaOtraPersona.usuario_nombre}</strong> ya tiene una caja abierta en <strong>{sesion.sucursal.nombre}</strong>.
            No se puede abrir otra caja hasta que la cierre.
          </p>
          <div style={{ background:C.violetaPale, borderRadius:12, padding:"12px 16px", fontSize:13, color:C.violeta, fontWeight:700 }}>
            Abierta desde las {cajaOtraPersona.hora_apertura}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight:"100vh", background:C.violeta, display:"flex", alignItems:"center", justifyContent:"center", padding:20, fontFamily:"Nunito, sans-serif", position:"relative", overflow:"hidden" }}>
      <style>{FONTS}</style>
      <Blob color={C.amarillo} style={{ width:280, height:280, top:-80, right:-60, opacity:0.2 }} />
      <Blob color={C.rosa} style={{ width:180, height:180, bottom:-40, left:-40, opacity:0.25 }} />
      <Blob color={C.menta} style={{ width:140, height:140, top:"40%", left:"5%", opacity:0.15 }} />

      <div style={{ background:C.blanco, borderRadius:24, padding:"40px 36px", maxWidth:400, width:"100%", position:"relative", zIndex:1, boxShadow:"0 32px 80px rgba(45,21,89,0.5)" }}>
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <Logo size={50} />
          <div style={{ marginTop:16, background:C.violetaPale, borderRadius:14, padding:"10px 16px" }}>
            <div style={{ fontSize:13, color:C.violetaMed, fontWeight:700 }}>{sesion.sucursal.nombre}</div>
            <div style={{ fontSize:15, fontWeight:900, color:C.violeta }}>{sesion.usuario.nombre}</div>
            <div style={{ fontSize:11, color:"#aaa", marginTop:2 }}>{new Date().toLocaleDateString("es-AR", { weekday:"long", day:"2-digit", month:"long" })}</div>
          </div>
        </div>

        <div style={{ textAlign:"center", marginBottom:24 }}>
          <div style={{ fontSize:40, marginBottom:8 }}>🏪</div>
          <h2 style={{ margin:"0 0 6px", color:C.violeta, fontFamily:"Baloo 2, cursive", fontSize:22 }}>Apertura de Caja</h2>
          <p style={{ margin:0, color:"#888", fontSize:13 }}>Ingresá el fondo inicial en efectivo (opcional)</p>
        </div>

        <div style={{ marginBottom:20 }}>
          <label style={{ fontSize:12, color:C.violeta, fontWeight:800, display:"block", marginBottom:6, textTransform:"uppercase", letterSpacing:1 }}>
            💵 Fondo inicial en efectivo
          </label>
          <input
            type="number"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && abrir()}
            placeholder="$0"
            style={{ width:"100%", padding:"14px", borderRadius:14, border:`2px solid ${C.violetaLight}`, fontSize:20, fontWeight:900, color:C.violeta, textAlign:"center", boxSizing:"border-box", fontFamily:"Nunito, sans-serif", outline:"none" }}
          />
          <p style={{ fontSize:11, color:"#aaa", textAlign:"center", marginTop:6 }}>Dejalo en $0 si no tenés fondo inicial</p>
        </div>

        <button onClick={abrir} style={{
          width:"100%", padding:"14px", borderRadius:14, border:"none",
          background:`linear-gradient(135deg, ${C.violeta}, ${C.violetaMed})`,
          color:"#fff", fontWeight:900, fontSize:16, cursor:"pointer",
          fontFamily:"Baloo 2, cursive", letterSpacing:0.5,
          boxShadow:`0 6px 20px rgba(91,45,142,0.4)`,
        }}>
          Abrir caja y comenzar turno 🍦
        </button>
      </div>
    </div>
  );
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function Login({ data, onLogin }) {
  const [sucId, setSucId] = useState("");
  const [userId, setUserId] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState("");
  const [adminMode, setAdminMode] = useState(false);
  const [recordar, setRecordar] = useState(false);

  const empleadosFiltrados = data.usuarios.filter(
    (u) => u.rol === "empleada" && (sucId === "" || u.sucursal_id === Number(sucId))
  );

  const handleLogin = () => {
    setError("");
    const usuario = data.usuarios.find((u) => u.id === Number(userId));
    if (!usuario) { setError("Seleccioná un usuario."); return; }
    if (usuario.rol === "empleada" && !sucId) { setError("Elegí la sucursal."); return; }
    if (usuario.clave !== clave) { setError("Clave incorrecta ❌"); return; }
    const suc = usuario.rol === "admin" ? null : data.sucursales.find((s) => s.id === Number(sucId));
    if (usuario.rol === "admin" && recordar) {
      try { localStorage.setItem("venecia_admin_id", String(usuario.id)); } catch(e) {}
    } else {
      try { localStorage.removeItem("venecia_admin_id"); } catch(e) {}
    }
    onLogin({ usuario, sucursal: suc });
  };

  const adminUser = data.usuarios.find(u => u.rol === "admin");

  const inputStyle = {
    width: "100%", padding: "13px 16px", borderRadius: 14,
    border: `2px solid ${C.violetaLight}`, background: C.blanco,
    color: C.dark, fontSize: 14, fontFamily: "Nunito, sans-serif",
    fontWeight: 600, boxSizing: "border-box", outline: "none",
    transition: "border-color 0.2s",
  };

  return (
    <div style={{
      minHeight: "100vh", background: C.violeta,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20, position: "relative", overflow: "hidden",
      fontFamily: "Nunito, sans-serif",
    }}>
      <style>{FONTS}</style>
      {/* Blobs decorativos */}
      <Blob color={C.amarillo} style={{ width: 300, height: 300, top: -80, right: -60, opacity: 0.25 }} />
      <Blob color={C.rosa} style={{ width: 200, height: 200, bottom: -40, left: -40, opacity: 0.3 }} />
      <Blob color={C.menta} style={{ width: 160, height: 160, top: "40%", right: "5%", opacity: 0.2 }} />
      <Blob color={C.amarillo} style={{ width: 100, height: 100, bottom: "20%", left: "8%", opacity: 0.2 }} />

      <div style={{
        background: C.blanco, borderRadius: 28, padding: "40px 36px",
        maxWidth: 420, width: "100%", position: "relative", zIndex: 1,
        boxShadow: "0 32px 80px rgba(45,21,89,0.45)",
        overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: "50%", background: C.violetaPale }} />
        <div style={{ position: "absolute", bottom: -20, left: -20, width: 80, height: 80, borderRadius: "50%", background: C.amarilloLight }} />

        <div style={{ textAlign: "center", marginBottom: 32, position: "relative" }}>
          <Logo size={52} />
          <p style={{ color: C.violetaMed, fontSize: 13, margin: "10px 0 0", fontWeight: 600 }}>
            Sistema de Ventas
          </p>
        </div>

        {/* Tabs empleada / admin */}
        <div style={{ display: "flex", background: C.violetaPale, borderRadius: 14, padding: 4, marginBottom: 24 }}>
          {[{ key: false, label: "🍦 Empleada" }, { key: true, label: "⚙️ Administrador" }].map(t => (
            <button key={String(t.key)} onClick={() => { setAdminMode(t.key); setUserId(t.key && adminUser ? adminUser.id : ""); setSucId(""); setClave(""); setError(""); }}
              style={{
                flex: 1, padding: "9px", border: "none", borderRadius: 11,
                background: adminMode === t.key ? C.violeta : "transparent",
                color: adminMode === t.key ? C.blanco : C.violetaMed,
                fontWeight: 800, cursor: "pointer", fontSize: 13,
                fontFamily: "Nunito, sans-serif", transition: "all 0.2s",
              }}>
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {!adminMode && (
            <>
              <div>
                <label style={{ color: C.violeta, fontSize: 12, fontWeight: 800, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>Sucursal</label>
                <select value={sucId} onChange={(e) => { setSucId(e.target.value); setUserId(""); }}
                  style={{ ...inputStyle }}>
                  <option value="">— Elegí tu sucursal —</option>
                  {data.sucursales.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
              </div>
              <div>
                <label style={{ color: C.violeta, fontSize: 12, fontWeight: 800, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>¿Quién sos?</label>
                <select value={userId} onChange={(e) => setUserId(e.target.value)} disabled={!sucId}
                  style={{ ...inputStyle, opacity: sucId ? 1 : 0.5 }}>
                  <option value="">— Seleccioná tu nombre —</option>
                  {empleadosFiltrados.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                </select>
              </div>
            </>
          )}

          <div>
            <label style={{ color: C.violeta, fontSize: 12, fontWeight: 800, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>Clave</label>
            <input type="password" value={clave} onChange={(e) => setClave(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              placeholder="••••••"
              style={inputStyle} />
          </div>

          {error && (
            <div style={{ background: "#ffe8e8", border: "1px solid #ffb3b3", borderRadius: 10, padding: "10px 14px", color: "#c0392b", fontWeight: 700, fontSize: 13, textAlign: "center" }}>
              {error}
            </div>
          )}

          {adminMode && (
            <label style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer" }}>
              <input
                type="checkbox"
                checked={recordar}
                onChange={function(e) { setRecordar(e.target.checked); }}
                style={{ width:18, height:18, cursor:"pointer", accentColor:C.amarillo }}
              />
              <span style={{ fontSize:13, color:"rgba(255,255,255,0.8)", fontWeight:600 }}>
                Recordar sesión en este dispositivo
              </span>
            </label>
          )}
          <button onClick={handleLogin} style={{
            padding: "14px", borderRadius: 14, border: "none",
            background: `linear-gradient(135deg, ${C.violeta}, ${C.violetaMed})`,
            color: C.blanco, fontWeight: 900, fontSize: 16, cursor: "pointer",
            fontFamily: "Baloo 2, cursive", letterSpacing: 0.5,
            boxShadow: `0 6px 20px rgba(91,45,142,0.4)`,
            transition: "transform 0.1s",
          }}>
            Entrar al sistema 🍦
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── PUNTO DE VENTA ───────────────────────────────────────────────────────────
function POS({ data, setData, sesion, caja, onCerrarCaja, onLogout }) {
  const [carrito, setCarrito] = useState([]);
  const [formaPago, setFormaPago] = useState("");
  const [recibido, setRecibido] = useState("");
  const [ticketVenta, setTicketVenta] = useState(null);
  const [detalleVenta, setDetalleVenta] = useState(null);
  const [paso, setPaso] = useState("productos");
  const [pagos, setPagos] = useState([]); // [{medio, monto}]
  const [empleadaConsumoId, setEmpleadaConsumoId] = useState(null); // quien consume
  const [empleadaConsumoNombre, setEmpleadaConsumoNombre] = useState("");
  const [catActiva, setCatActiva] = useState("productos");
  const [mostrarCierre, setMostrarCierre] = useState(false);
  const [ticketCierre, setTicketCierre] = useState(null);
  const [mostrarCorte, setMostrarCorte] = useState(false);
  const [mostrarRetiro, setMostrarRetiro] = useState(false);
  const [retiroMonto, setRetiroMonto] = useState("");
  const [retiroMotivo, setRetiroMotivo] = useState("");

  const total = carrito.reduce((s, i) => s + i.subtotal, 0);
  const vuelto = recibido && formaPago === "efectivo" ? Math.max(0, Number(recibido) - total) : 0;
  const cantItems = carrito.reduce((s, i) => s + i.cantidad, 0);

  const agregarProducto = (prod) => {
    setCarrito((prev) => {
      const existe = prev.find((i) => i.id === prod.id);
      if (existe) return prev.map((i) => i.id === prod.id ? { ...i, cantidad: i.cantidad + 1, subtotal: (i.cantidad + 1) * i.precio } : i);
      return [...prev, { ...prod, cantidad: 1, subtotal: prod.precio }];
    });
  };

  const cambiarCantidad = (id, delta) => {
    setCarrito((prev) => prev.map((i) => i.id === id ? { ...i, cantidad: i.cantidad + delta, subtotal: (i.cantidad + delta) * i.precio } : i).filter((i) => i.cantidad > 0));
  };

  const confirmarVenta = () => {
    if (!formaPago) return;
    // monto recibido es opcional en efectivo
    // Determinar forma de pago final
    var formaPagoFinal = formaPago;
    var pagosMixtos = null;
    if (hayPagos) {
      formaPagoFinal = "mixto";
      pagosMixtos = pagos;
    }
    const nuevaVenta = {
      id: Date.now(), fecha: hoy(), hora: ahora(),
      cajaId: caja.id,
      sucursal_id: sesion.sucursal.id,
      usuario_id: sesion.usuario.id, usuario_nombre: sesion.usuario.nombre,
      items: carrito.map((i) => {
        const costoReal = calcularCosto(i, data.insumos);
        return { id: i.id, nombre: i.nombre, cantidad: i.cantidad, precio: i.precio, costo: costoReal, subtotal: i.subtotal, costo_total: costoReal * i.cantidad };
      }),
      total, costo_total: carrito.reduce((s, i) => s + calcularCosto(i, data.insumos) * i.cantidad, 0),
      formaPago: formaPagoFinal,
      pagosMixtos: pagosMixtos,
      recibido: recibido ? Number(recibido) : 0,
      vuelto: recibido && Number(recibido) > total ? Number(recibido) - total : 0,
    };
    var nombreConsumo = String(empleadaConsumoId) === "otro"
      ? (empleadaConsumoNombre || "Sin nombre")
      : empleadaConsumoId
        ? (data.usuarios.find(function(u) { return u.id === Number(empleadaConsumoId); }) || sesion.usuario).nombre
        : sesion.usuario.nombre;
    var idConsumo = String(empleadaConsumoId) === "otro" ? null : (empleadaConsumoId ? Number(empleadaConsumoId) : sesion.usuario.id);
    var consumoObj = formaPago === "consumo" ? {
      id: nuevaVenta.id, fecha: nuevaVenta.fecha, hora: nuevaVenta.hora,
      usuarioId: idConsumo,
      usuarioNombre: nombreConsumo,
      registradoPor: sesion.usuario.nombre,
      sucursalNombre: sesion.sucursal.nombre,
      items: nuevaVenta.items, total: nuevaVenta.total, cajaId: caja.id,
    } : null;
    guardarVenta(nuevaVenta);
    if (consumoObj) guardarConsumo(consumoObj);
    setData(function(prev) {
      var next = { ...prev, ventas: [...prev.ventas, nuevaVenta] };
      if (consumoObj) next.consumosEmpleado = [...prev.consumosEmpleado, consumoObj];
      return next;
    });
    setTicketVenta(nuevaVenta);
    setCarrito([]); setFormaPago(""); setRecibido(""); setPaso("productos"); setPagos([]); setEmpleadaConsumoId(null); setEmpleadaConsumoNombre("");
    // Imprimir automáticamente via iframe
    setTimeout(function() {
      if (nuevaVenta) {
        var fp = nuevaVenta.formaPago === "efectivo" ? "Efectivo" : nuevaVenta.formaPago === "tarjeta" ? "Tarjeta/Debito" : nuevaVenta.formaPago === "qr" ? "QR/Transferencia" : nuevaVenta.formaPago === "consumo" ? "Consumo empleado" : "Pago mixto";
        var items = nuevaVenta.items.map(function(it) {
          return '<tr><td>' + it.nombre + ' x' + it.cantidad + '</td><td align="right">' + '$' + Number(it.subtotal).toLocaleString('es-AR') + '</td></tr>';
        }).join('');
        var pagosMixtos = nuevaVenta.pagosMixtos ? nuevaVenta.pagosMixtos.map(function(p) {
          var lb = {efectivo:'Efectivo', tarjeta:'Tarjeta', qr:'QR'};
          return '<tr><td>' + (lb[p.medio]||p.medio) + '</td><td align="right">$' + Number(p.monto).toLocaleString('es-AR') + '</td></tr>';
        }).join('') : '';
        var html = '<!DOCTYPE html><html><head><meta charset="utf-8"><style>' +
          'body{font-family:Courier New,monospace;font-size:11px;width:76mm;margin:0;padding:2mm;}' +
          'h2{text-align:center;font-size:14px;margin:2mm 0;}' +
          '.sub{text-align:center;font-size:10px;margin:1mm 0;}' +
          'hr{border:none;border-top:1px dashed #000;margin:2mm 0;}' +
          'table{width:100%;border-collapse:collapse;font-size:11px;}' +
          '.total{text-align:center;font-size:14px;font-weight:bold;border-top:1px solid #000;border-bottom:1px solid #000;padding:1mm 0;margin:2mm 0;}' +
          '@page{width:80mm;margin:0;}' +
          '</style></head><body>' +
          '<h2>VENECIA</h2>' +
          '<div class="sub">Helados Artesanales</div>' +
          '<div class="sub">' + (sesion.sucursal ? sesion.sucursal.nombre : '') + '</div>' +
          '<hr>' +
          '<div class="sub">' + nuevaVenta.fecha + ' ' + nuevaVenta.hora + '</div>' +
          '<div class="sub">Atendio: ' + sesion.usuario.nombre + '</div>' +
          '<div class="sub">Ticket #' + String(nuevaVenta.id).slice(-5) + '</div>' +
          '<hr>' +
          '<table>' + items + '</table>' +
          '<hr>' +
          '<div class="total">TOTAL: $' + Number(nuevaVenta.total).toLocaleString('es-AR') + '</div>' +
          '<table><tr><td>Forma de pago:</td><td align="right">' + fp + '</td></tr>' + pagosMixtos + '</table>' +
          (nuevaVenta.vuelto > 0 ? '<table><tr><td>Vuelto:</td><td align="right">$' + Number(nuevaVenta.vuelto).toLocaleString('es-AR') + '</td></tr></table>' : '') +
          '<hr><div class="sub">Gracias por su visita!</div>' +
          '</body></html>';
        imprimirHTML(html);
      }
    }, 200);
  };

  // Calcular totales de pagos mixtos
  var totalPagado = pagos.reduce(function(s, p) { return s + Number(p.monto || 0); }, 0);
  var saldoPendiente = total - totalPagado;
  var hayPagos = pagos.length > 0;
  // pagoOk: si hay pagos mixtos que cubren el total, o si hay un medio simple seleccionado
  var pagoOk = (hayPagos && saldoPendiente <= 0) || (!hayPagos && formaPago !== "");

  var retirosCaja = data.retiros.filter(function(r) { return r.cajaId === caja.id; });
  var totalRetiros = retirosCaja.reduce(function(s, r) { return s + r.monto; }, 0);

  function guardarRetiro() {
    if (!retiroMonto || !retiroMotivo) return;
    var nuevoRetiro = {
      id: Date.now(),
      cajaId: caja.id,
      fecha: hoy(),
      hora: ahora(),
      usuarioId: sesion.usuario.id,
      usuarioNombre: sesion.usuario.nombre,
      sucursalNombre: sesion.sucursal.nombre,
      motivo: retiroMotivo,
      monto: Number(retiroMonto),
    };
    guardarRetiro(nuevoRetiro);
    setData(function(prev) {
      return { ...prev, retiros: [...prev.retiros, nuevoRetiro] };
    });
    setRetiroMonto("");
    setRetiroMotivo("");
    setMostrarRetiro(false);
  }

  const handleCerrarCaja = async function() {
    const horaCierre = ahora();
    const cajaCerrada = { ...caja, horaCierre, cerrada: true, ventas: ventasCaja };
    try {
      await cerrarCaja(caja.id, horaCierre);
    } catch(e) {
      console.error("Error cerrando caja:", e);
    }
    setData(function(prev) {
      return { ...prev, cajas: prev.cajas.map(function(c) { return c.id === caja.id ? { ...c, hora_cierre: horaCierre, cerrada: true } : c; }) };
    });
    setTicketCierre(cajaCerrada);
    setMostrarCierre(false);
    // Imprimir cierre via iframe
    setTimeout(function() {
      var ef = ventasCaja.filter(function(v){return v.formaPago==="efectivo";}).reduce(function(s,v){return s+v.total;},0);
      var tj = ventasCaja.filter(function(v){return v.formaPago==="tarjeta";}).reduce(function(s,v){return s+v.total;},0);
      var qr = ventasCaja.filter(function(v){return v.formaPago==="qr";}).reduce(function(s,v){return s+v.total;},0);
      var co = ventasCaja.filter(function(v){return v.formaPago==="consumo";}).reduce(function(s,v){return s+v.total;},0);
      var retirosC = (data.retiros||[]).filter(function(r){return r.cajaId===caja.id;});
      var totalRet = retirosC.reduce(function(s,r){return s+r.monto;},0);
      var efFisico = ef - totalRet + (caja.montoInicial||0);
      var fmt2 = function(n){ return '$'+Number(n).toLocaleString('es-AR'); };
      var filasRetiros = retirosC.map(function(r){ return '<tr><td>Retiro: '+r.motivo+'</td><td align="right">('+fmt2(r.monto)+')</td></tr>'; }).join('');
      var html = '<!DOCTYPE html><html><head><meta charset="utf-8"><style>' +
        'body{font-family:Courier New,monospace;font-size:11px;width:76mm;margin:0;padding:2mm;}' +
        'h2{text-align:center;font-size:14px;margin:2mm 0;}' +
        '.sub{text-align:center;font-size:10px;margin:1mm 0;}' +
        'hr{border:none;border-top:1px dashed #000;margin:2mm 0;}' +
        'table{width:100%;border-collapse:collapse;font-size:11px;}' +
        '.total{font-size:13px;font-weight:bold;border-top:1px solid #000;padding-top:1mm;margin-top:1mm;}' +
        '.efisico{text-align:center;font-size:13px;font-weight:bold;border:1px solid #000;padding:2mm;margin:2mm 0;}' +
        '@page{width:80mm;margin:0;}' +
        '</style></head><body>' +
        '<h2>VENECIA - CIERRE</h2>' +
        '<div class="sub">' + (sesion.sucursal ? sesion.sucursal.nombre : '') + '</div>' +
        '<div class="sub">Cajera: ' + sesion.usuario.nombre + '</div>' +
        '<div class="sub">Apertura: ' + (caja.horaApertura||'') + ' | Cierre: ' + horaCierre + '</div>' +
        '<hr>' +
        '<table>' +
        '<tr><td>Ventas del turno</td><td align="right">' + ventasCaja.length + '</td></tr>' +
        '<tr><td>Total ventas</td><td align="right">' + fmt2(totalCaja) + '</td></tr>' +
        '</table><hr>' +
        '<table>' +
        '<tr><td>Efectivo</td><td align="right">' + fmt2(ef) + '</td></tr>' +
        '<tr><td>Tarjeta/Debito</td><td align="right">' + fmt2(tj) + '</td></tr>' +
        '<tr><td>QR/Transfer.</td><td align="right">' + fmt2(qr) + '</td></tr>' +
        (co > 0 ? '<tr><td>Consumo empl.</td><td align="right">' + fmt2(co) + '</td></tr>' : '') +
        filasRetiros +
        '</table><hr>' +
        '<div class="efisico">EFECTIVO FISICO: ' + fmt2(efFisico) + '</div>' +
        '<hr><div class="sub">Fin del turno</div>' +
        '</body></html>';
      imprimirHTML(html);
    }, 200);
  };

  const ventasCaja = data.ventas.filter(v => v.cajaId === caja.id);
  const totalCaja = ventasCaja.reduce((s,v) => s + v.total, 0);

  return (
    <div style={{ minHeight: "100vh", background: C.crema, fontFamily: "Nunito, sans-serif", display: "flex", flexDirection: "column" }}>
      <style>{FONTS}</style>

      {/* Header */}
      <div style={{ background: C.violeta, padding: "10px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 4px 16px rgba(45,21,89,0.3)", position: "relative", overflow: "hidden" }}>
        <Blob color={C.amarillo} style={{ width: 120, height: 120, top: -40, right: 80, opacity: 0.2 }} />
        <Logo size={38} dark />
        <div style={{ display: "flex", alignItems: "center", gap: 12, position: "relative" }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: C.blanco, fontWeight: 800, fontSize: 14 }}>{sesion.usuario.nombre}</div>
            <div style={{ color: C.violetaLight, fontSize: 11 }}>{sesion.sucursal.nombre} · Apertura: {caja.horaApertura}</div>
            <div style={{ color: C.amarillo, fontSize: 11, fontWeight:800 }}>{ventasCaja.length} venta{ventasCaja.length !== 1 ? "s" : ""} en el turno</div>
          </div>
          <div style={{ display:"flex", gap:8, position:"relative" }}>
            <button onClick={() => setMostrarRetiro(true)} style={{ padding:"6px 16px", borderRadius:10, border:"2px solid rgba(255,255,255,0.4)", background:"transparent", color:"rgba(255,255,255,0.9)", cursor:"pointer", fontSize:12, fontFamily:"Nunito, sans-serif", fontWeight:800 }}>
              💸 Retiro
            </button>
            <button onClick={() => setMostrarCorte(true)} style={{ padding:"6px 16px", borderRadius:10, border:"2px solid rgba(255,255,255,0.4)", background:"transparent", color:"rgba(255,255,255,0.9)", cursor:"pointer", fontSize:12, fontFamily:"Nunito, sans-serif", fontWeight:800 }}>
              🧾 Corte parcial
            </button>
            <button onClick={() => setMostrarCierre(true)} style={{ padding:"6px 16px", borderRadius:10, border:"none", background:C.amarillo, color:C.dark, cursor:"pointer", fontSize:12, fontFamily:"Nunito, sans-serif", fontWeight:900 }}>
              🔒 Cerrar caja
            </button>
            <button onClick={onLogout} style={{ padding:"6px 14px", borderRadius:10, border:`2px solid rgba(255,255,255,0.3)`, background:"transparent", color:"rgba(255,255,255,0.8)", cursor:"pointer", fontSize:12, fontFamily:"Nunito, sans-serif", fontWeight:700 }}>
              Salir
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* PRODUCTOS CON TABS */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Tabs categoria */}
          <div style={{ display: "flex", gap: 6, padding: "10px 14px 0", background: C.crema, borderBottom: `3px solid ${C.violeta}` }}>
            {[
              { key: "productos", label: "🍦 Productos" },
              { key: "promos",    label: "⭐ Promos" },
              { key: "pedidoya",  label: "📦 Pedido Ya" },
            ].map((cat) => (
              <button key={cat.key} onClick={() => setCatActiva(cat.key)}
                style={{
                  padding: "8px 16px", border: "none",
                  borderRadius: "10px 10px 0 0",
                  background: catActiva === cat.key ? C.violeta : C.blanco,
                  color: catActiva === cat.key ? C.blanco : C.violetaMed,
                  fontWeight: 800, cursor: "pointer", fontSize: 13,
                  fontFamily: "Nunito, sans-serif",
                  marginBottom: catActiva === cat.key ? "-3px" : 0,
                  transition: "all 0.15s",
                }}>
                {cat.label}
              </button>
            ))}
          </div>
          <div style={{ flex: 1, padding: "14px 16px", overflowY: "auto", background: C.blanco }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10 }}>
              {data.productos.filter((p) => p.activo && p.categoria === catActiva).map((prod) => {
                const enCarrito = carrito.find((i) => i.id === prod.id);
                return (
                  <button key={prod.id} onClick={() => agregarProducto(prod)}
                    style={{
                      background: enCarrito ? C.violeta : C.blanco,
                      border: enCarrito ? "3px solid " + C.violeta : "3px solid " + C.violetaPale,
                      borderRadius: 18, padding: "14px 10px", cursor: "pointer",
                      transition: "all 0.18s", boxShadow: enCarrito ? `0 6px 18px rgba(91,45,142,0.35)` : "0 2px 8px rgba(0,0,0,0.06)",
                      textAlign: "center", position: "relative",
                      transform: enCarrito ? "scale(1.03)" : "scale(1)",
                    }}>
                    {enCarrito && (
                      <span style={{
                        position: "absolute", top: -8, right: -8,
                        background: C.amarillo, color: C.dark,
                        borderRadius: "50%", width: 22, height: 22,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 11, fontWeight: 900, boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                      }}>{enCarrito.cantidad}</span>
                    )}
                    <div style={{ fontSize: 30, marginBottom: 6 }}>{prod.emoji}</div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: enCarrito ? C.blanco : C.dark, lineHeight: 1.2, marginBottom: 5 }}>{prod.nombre}</div>
                    <div style={{
                      fontSize: 13, fontWeight: 900,
                      color: enCarrito ? C.amarillo : C.violeta,
                      background: enCarrito ? "rgba(255,255,255,0.1)" : C.violetaPale,
                      borderRadius: 8, padding: "2px 8px", display: "inline-block",
                    }}>{fmt(prod.precio)}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* CARRITO */}
        <div style={{ width: 310, background: C.blanco, borderLeft: `3px solid ${C.violetaPale}`, display: "flex", flexDirection: "column", boxShadow: "-4px 0 20px rgba(91,45,142,0.08)" }}>
          {/* Tabs */}
          <div style={{ display: "flex", padding: 8, gap: 6, borderBottom: "2px solid " + C.violetaPale }}>
            <button onClick={() => setPaso("productos")}
              style={{ flex: 2, padding: "9px 6px", border: "none", borderRadius: 10,
                background: paso === "productos" ? C.violeta : C.violetaPale,
                color: paso === "productos" ? C.blanco : C.violetaMed,
                fontWeight: 800, cursor: "pointer", fontSize: 12, fontFamily: "Nunito, sans-serif" }}>
              {cantItems > 0 ? "Pedido (" + cantItems + ")" : "Pedido"}
            </button>
            <button onClick={() => carrito.length > 0 && setPaso("pago")}
              style={{ flex: 1, padding: "9px 6px", border: "none", borderRadius: 10,
                background: paso === "pago" ? C.violeta : C.violetaPale,
                color: paso === "pago" ? C.blanco : C.violetaMed,
                fontWeight: 800, cursor: "pointer", fontSize: 12, fontFamily: "Nunito, sans-serif" }}>
              Cobrar
            </button>
            <button onClick={() => setPaso("ventas")}
              style={{ flex: 1, padding: "9px 6px", border: "none", borderRadius: 10, position: "relative",
                background: paso === "ventas" ? C.violeta : C.violetaPale,
                color: paso === "ventas" ? C.blanco : C.violetaMed,
                fontWeight: 800, cursor: "pointer", fontSize: 12, fontFamily: "Nunito, sans-serif" }}>
              Ventas
              {ventasCaja.length > 0 && (
                <span style={{ position: "absolute", top: -3, right: -3, background: C.amarillo,
                  color: C.dark, borderRadius: "50%", width: 15, height: 15, fontSize: 9,
                  fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {ventasCaja.length}
                </span>
              )}
            </button>
          </div>

                    {paso === "ventas" ? (
            <div style={{ flex: 1, overflowY: "auto" }}>
              {ventasCaja.length === 0 ? (
                <div style={{ textAlign: "center", color: C.violetaLight, marginTop: 50, padding: 20 }}>
                  <div style={{ fontSize: 40 }}>📋</div>
                  <p style={{ fontSize: 13, fontWeight: 700 }}>Sin ventas en este turno</p>
                </div>
              ) : (
                <div>
                  {ventasCaja.slice().reverse().map(function(v, idx) {
                    var abierto = detalleVenta === v.id;
                    var nombres = v.items.map(function(it) { return it.nombre; }).join(", ");
                    var resumen = nombres.length > 28 ? nombres.slice(0, 28) + "…" : nombres;
                    var icono = v.formaPago === "efectivo" ? "Efectivo" : v.formaPago === "tarjeta" ? "Tarjeta" : "QR";
                    return (
                      <div key={v.id} style={{ borderBottom: "1px solid " + C.violetaPale }}>
                        <div
                          onClick={function() { setDetalleVenta(abierto ? null : v.id); }}
                          style={{ padding: "10px 12px", cursor: "pointer",
                            background: abierto ? C.violetaPale : idx % 2 === 0 ? C.blanco : C.crema,
                            display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 800, color: C.dark }}>{resumen}</div>
                            <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>
                              {v.hora} · {icono}
                            </div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontWeight: 900, color: "#27ae60", fontSize: 14 }}>{fmt(v.total)}</div>
                            <div style={{ fontSize: 10, color: "#aaa" }}>{abierto ? "▲ cerrar" : "▼ ver"}</div>
                          </div>
                        </div>
                        {abierto && (
                          <div style={{ padding: "8px 14px 12px", background: C.violetaPale }}>
                            {v.items.map(function(it, j) {
                              return (
                                <div key={j} style={{ display: "flex", justifyContent: "space-between",
                                  fontSize: 12, padding: "3px 0", borderBottom: "1px solid " + C.violetaLight }}>
                                  <span style={{ color: C.dark }}>{it.nombre} x{it.cantidad}</span>
                                  <span style={{ fontWeight: 700 }}>{fmt(it.subtotal)}</span>
                                </div>
                              );
                            })}
                            <div style={{ display: "flex", justifyContent: "space-between",
                              fontWeight: 900, color: C.violeta, fontSize: 13, marginTop: 6 }}>
                              <span>Total</span>
                              <span>{fmt(v.total)}</span>
                            </div>
                            {v.formaPago === "efectivo" && v.vuelto > 0 && (
                              <div style={{ display: "flex", justifyContent: "space-between",
                                fontSize: 12, color: "#27ae60", fontWeight: 700, marginTop: 3 }}>
                                <span>Vuelto</span>
                                <span>{fmt(v.vuelto)}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : paso === "productos" ? (
            <div style={{ flex: 1, overflowY: "auto", padding: "8px 12px" }}>
              {carrito.length === 0 ? (
                <div style={{ textAlign: "center", color: C.violetaLight, marginTop: 50, padding: 20 }}>
                  <div style={{ fontSize: 48, marginBottom: 10 }}>🍦</div>
                  <p style={{ fontSize: 13, fontWeight: 700 }}>Tocá un producto para agregarlo</p>
                </div>
              ) : (
                carrito.map((item) => (
                  <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 0", borderBottom: `1px solid ${C.violetaPale}` }}>
                    <span style={{ fontSize: 22 }}>{item.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: C.dark }}>{item.nombre}</div>
                      <div style={{ fontSize: 11, color: C.violetaMed }}>{fmt(item.precio)} c/u</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <button onClick={() => cambiarCantidad(item.id, -1)} style={{ width: 26, height: 26, borderRadius: "50%", border: `2px solid ${C.violetaLight}`, background: C.blanco, cursor: "pointer", fontWeight: 900, fontSize: 14, color: C.violeta, display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                      <span style={{ fontSize: 13, fontWeight: 900, minWidth: 20, textAlign: "center", color: C.violeta }}>{item.cantidad}</span>
                      <button onClick={() => cambiarCantidad(item.id, 1)} style={{ width: 26, height: 26, borderRadius: "50%", border: "none", background: C.violeta, cursor: "pointer", fontWeight: 900, fontSize: 14, color: C.blanco, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 900, color: C.violeta, minWidth: 58, textAlign: "right" }}>{fmt(item.subtotal)}</div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px" }}>
              <p style={{ fontSize: 11, color: C.violetaMed, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Forma de pago</p>

              {/* Modo pago único o mixto */}
              <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                <button onClick={function() { setPagos([]); setFormaPago(""); }}
                  style={{ flex:1, padding:"7px", borderRadius:10, border: !hayPagos ? "2px solid " + C.violeta : "2px solid " + C.violetaLight,
                    background: !hayPagos ? C.violetaPale : C.blanco, color: C.violeta, fontWeight:800, cursor:"pointer", fontSize:12, fontFamily:"Nunito, sans-serif" }}>
                  Un medio
                </button>
                <button onClick={function() { setFormaPago("mixto"); if(pagos.length===0) setPagos([{medio:"efectivo", monto:""}, {medio:"qr", monto:""}]); }}
                  style={{ flex:1, padding:"7px", borderRadius:10, border: hayPagos ? "2px solid " + C.violeta : "2px solid " + C.violetaLight,
                    background: hayPagos ? C.violetaPale : C.blanco, color: C.violeta, fontWeight:800, cursor:"pointer", fontSize:12, fontFamily:"Nunito, sans-serif" }}>
                  Pago mixto
                </button>
              </div>

              {/* PAGO ÚNICO */}
              {!hayPagos && (
                <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:12 }}>
                  {[
                    { key:"efectivo", label:"💵 Efectivo" },
                    { key:"tarjeta", label:"💳 Tarjeta / Débito" },
                    { key:"qr", label:"📱 QR / Transferencia" },
                    { key:"consumo", label:"👤 Consumo empleado" },
                  ].map(function(fp) {
                    return (
                      <button key={fp.key} onClick={function() { setFormaPago(fp.key); }}
                        style={{ padding:"11px 14px", borderRadius:12, cursor:"pointer", fontSize:14, textAlign:"left", fontFamily:"Nunito, sans-serif", transition:"all 0.15s",
                          border: formaPago === fp.key ? "3px solid " + C.violeta : "3px solid " + C.violetaPale,
                          background: formaPago === fp.key ? C.violetaPale : C.blanco,
                          color: formaPago === fp.key ? C.violeta : "#555",
                          fontWeight: formaPago === fp.key ? 800 : 600 }}>
                        {fp.label}
                      </button>
                    );
                  })}
                  {formaPago === "efectivo" && (
                    <div>
                      <label style={{ fontSize:11, color:C.violetaMed, fontWeight:800, display:"block", marginBottom:6, textTransform:"uppercase" }}>Monto recibido (opcional)</label>
                      <input type="number" value={recibido} onChange={function(e){setRecibido(e.target.value);}} placeholder="Opcional"
                        style={{ width:"100%", padding:"12px", borderRadius:12, border:"2px solid " + C.violetaLight, fontSize:18, fontWeight:900, color:C.violeta, boxSizing:"border-box", fontFamily:"Nunito, sans-serif", outline:"none" }} />
                      {recibido && Number(recibido) >= total && (
                        <div style={{ marginTop:8, padding:"10px 14px", background:C.mentaPale, borderRadius:10, color:"#2a7a5e", fontWeight:800, fontSize:15, display:"flex", justifyContent:"space-between" }}>
                          <span>Vuelto:</span><span>{fmt(vuelto)}</span>
                        </div>
                      )}
                    </div>
                  )}
                  {formaPago === "consumo" && (
                    <div style={{ background:"#e8f0fe", borderRadius:10, padding:"12px 14px" }}>
                      <div style={{ fontWeight:800, color:"#2d5fa8", fontSize:13, marginBottom:8 }}>
                        Quien consume:
                      </div>
                      <select
                        value={empleadaConsumoId || sesion.usuario.id}
                        onChange={function(e) { setEmpleadaConsumoId(e.target.value); }}
                        style={{ width:"100%", padding:"9px 12px", borderRadius:10, border:"2px solid #b3c8f0",
                          fontSize:14, fontFamily:"Nunito, sans-serif", fontWeight:700, color:"#2d5fa8",
                          background:"white", outline:"none", marginBottom:8 }}>
                        {data.usuarios.filter(function(u) { return u.rol !== "admin"; }).map(function(u) {
                          return (
                            <option key={u.id} value={u.id}>{u.nombre}</option>
                          );
                        })}
                        <option value="otro">Otro (escribir nombre)...</option>
                      </select>
                      {String(empleadaConsumoId) === "otro" && (
                        <input
                          type="text"
                          placeholder="Nombre de quien consume"
                          value={empleadaConsumoNombre || ""}
                          onChange={function(e) { setEmpleadaConsumoNombre(e.target.value); }}
                          style={{ width:"100%", padding:"9px 12px", borderRadius:10, border:"2px solid #b3c8f0",
                            fontSize:14, fontFamily:"Nunito, sans-serif", fontWeight:700, color:"#2d5fa8",
                            outline:"none", marginBottom:8, boxSizing:"border-box" }}
                        />
                      )}
                      <div style={{ fontSize:11, color:"#888" }}>
                        Registrado por: {sesion.usuario.nombre}. No descuenta de caja.
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* PAGO MIXTO */}
              {hayPagos && (
                <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:8 }}>
                  {pagos.map(function(pago, idx) {
                    var saldoEste = total - pagos.reduce(function(s,p,i){ return i < idx ? s + Number(p.monto||0) : s; }, 0);
                    return (
                      <div key={idx} style={{ background:C.crema, borderRadius:12, padding:"10px 12px" }}>
                        <div style={{ display:"flex", gap:6, marginBottom:8, flexWrap:"wrap" }}>
                          {[
                            { key:"efectivo", label:"💵 Efectivo" },
                            { key:"tarjeta", label:"💳 Tarjeta" },
                            { key:"qr", label:"📱 QR" },
                          ].map(function(m) {
                            return (
                              <button key={m.key}
                                onClick={function() { setPagos(pagos.map(function(p,i){ return i===idx ? {...p, medio:m.key} : p; })); }}
                                style={{ padding:"5px 10px", borderRadius:8, cursor:"pointer", fontSize:12, fontFamily:"Nunito, sans-serif",
                                  border: pago.medio===m.key ? "2px solid " + C.violeta : "2px solid " + C.violetaLight,
                                  background: pago.medio===m.key ? C.violetaPale : C.blanco,
                                  color: pago.medio===m.key ? C.violeta : "#555", fontWeight: pago.medio===m.key ? 800 : 600 }}>
                                {m.label}
                              </button>
                            );
                          })}
                          {pagos.length > 2 && (
                            <button onClick={function() { setPagos(pagos.filter(function(_,i){ return i!==idx; })); }}
                              style={{ padding:"5px 8px", borderRadius:8, border:"none", background:"#ffe8e8", color:"#e74c3c", cursor:"pointer", fontSize:12, fontWeight:800 }}>✕</button>
                          )}
                        </div>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <input type="number"
                            value={pago.monto}
                            onChange={function(e) { setPagos(pagos.map(function(p,i){ return i===idx ? {...p, monto:e.target.value} : p; })); }}
                            placeholder={idx === pagos.length-1 && saldoEste > 0 ? "Saldo: " + fmt(saldoEste) : "Monto"}
                            style={{ flex:1, padding:"10px", borderRadius:10, border:"2px solid " + C.violetaLight, fontSize:16, fontWeight:900, color:C.violeta, fontFamily:"Nunito, sans-serif", outline:"none" }} />
                          {idx === pagos.length-1 && saldoEste > 0 && !pago.monto && (
                            <button onClick={function() { setPagos(pagos.map(function(p,i){ return i===idx ? {...p, monto:String(saldoEste)} : p; })); }}
                              style={{ padding:"10px 12px", borderRadius:10, border:"none", background:C.violeta, color:C.blanco, fontWeight:800, cursor:"pointer", fontSize:12, fontFamily:"Nunito, sans-serif", whiteSpace:"nowrap" }}>
                              Saldo {fmt(saldoEste)}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <button onClick={function() { setPagos([...pagos, {medio:"qr", monto:""}]); }}
                    style={{ padding:"8px", borderRadius:10, border:"2px dashed " + C.violetaLight, background:C.blanco, color:C.violetaMed, cursor:"pointer", fontSize:12, fontWeight:700, fontFamily:"Nunito, sans-serif" }}>
                    + Agregar otro medio
                  </button>
                  {saldoPendiente > 0 && (
                    <div style={{ background:"#fff3cd", borderRadius:10, padding:"8px 12px", fontWeight:800, color:"#856404", fontSize:13, display:"flex", justifyContent:"space-between" }}>
                      <span>⚠️ Saldo pendiente</span><span>{fmt(saldoPendiente)}</span>
                    </div>
                  )}
                  {saldoPendiente <= 0 && totalPagado > 0 && (
                    <div style={{ background:C.mentaPale, borderRadius:10, padding:"8px 12px", fontWeight:800, color:"#2a7a5e", fontSize:13, display:"flex", justifyContent:"space-between" }}>
                      <span>✅ Pago completo</span>
                      {totalPagado > total && <span>Vuelto: {fmt(totalPagado - total)}</span>}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Footer total — solo en vista pedido/pago */}
          {paso !== "ventas" && (<div style={{ padding: "14px 16px", borderTop: "3px solid " + C.violetaPale, background: C.blanco }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ color: C.violetaMed, fontWeight: 700, fontSize: 13 }}>TOTAL</span>
              <span style={{ fontSize: 26, fontWeight: 900, color: C.violeta, fontFamily: "Baloo 2, cursive" }}>{fmt(total)}</span>
            </div>
            {paso === "productos" ? (
              <button onClick={() => carrito.length > 0 && setPaso("pago")} disabled={carrito.length === 0}
                style={{
                  width: "100%", padding: "13px", borderRadius: 14, border: "none",
                  background: carrito.length > 0 ? C.violeta : C.violetaPale,
                  color: carrito.length > 0 ? C.blanco : C.violetaLight,
                  fontWeight: 900, fontSize: 15, cursor: carrito.length > 0 ? "pointer" : "default",
                  fontFamily: "Baloo 2, cursive", letterSpacing: 0.5,
                  boxShadow: carrito.length > 0 ? `0 4px 14px rgba(91,45,142,0.4)` : "none",
                }}>
                Ir a cobrar →
              </button>
            ) : (
              <button onClick={confirmarVenta} disabled={!pagoOk || carrito.length === 0}
                style={{
                  width: "100%", padding: "13px", borderRadius: 14, border: "none",
                  background: pagoOk ? `linear-gradient(135deg, #27ae60, #2ecc71)` : C.violetaPale,
                  color: pagoOk ? C.blanco : C.violetaLight,
                  fontWeight: 900, fontSize: 15, cursor: pagoOk ? "pointer" : "default",
                  fontFamily: "Baloo 2, cursive",
                  boxShadow: pagoOk ? "0 4px 14px rgba(39,174,96,0.4)" : "none",
                }}>
                ✓ Confirmar venta
              </button>
            )}
          </div>)}
        </div>
      </div>

      <TicketModal venta={ticketVenta} sucursal={sesion.sucursal.nombre} usuario={sesion.usuario.nombre} onClose={() => setTicketVenta(null)} />

      {/* Modal corte parcial */}
      {mostrarCorte && (() => {
        const efectivoCorte = ventasCaja.filter(v => v.formaPago === "efectivo").reduce((s,v) => s+v.total, 0);
        const tarjetaCorte  = ventasCaja.filter(v => v.formaPago === "tarjeta").reduce((s,v) => s+v.total, 0);
        const qrCorte       = ventasCaja.filter(v => v.formaPago === "qr").reduce((s,v) => s+v.total, 0);
        const totalCorte    = ventasCaja.reduce((s,v) => s+v.total, 0);
        const horaCorte     = ahora();
        return (
          <div style={{ position:"fixed", inset:0, background:"rgba(45,21,89,0.75)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:999, padding:20 }}>
            <div style={{ background:C.blanco, borderRadius:20, padding:"28px 24px", maxWidth:360, width:"100%", fontFamily:"Nunito, sans-serif", boxShadow:"0 24px 60px rgba(91,45,142,0.4)" }}>
              
              {/* Cabecera ticket */}
              <div style={{ textAlign:"center", borderBottom:`2px dashed ${C.violetaLight}`, paddingBottom:14, marginBottom:14 }}>
                <Logo size={44} />
                <div style={{ marginTop:8, fontSize:15, fontWeight:900, color:C.violeta }}>CORTE PARCIAL</div>
                <div style={{ fontSize:12, color:"#888" }}>{sesion.sucursal.nombre}</div>
                <div style={{ fontSize:12, color:"#aaa" }}>{fechaLegible(hoy())} · {horaCorte}</div>
                <div style={{ fontSize:13, fontWeight:800, color:C.dark, marginTop:2 }}>{sesion.usuario.nombre}</div>
                <div style={{ fontSize:11, color:"#aaa" }}>Apertura: {caja.horaApertura} · Corte: {horaCorte}</div>
              </div>

              {/* Detalle por pago */}
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:11, color:C.violetaMed, fontWeight:800, textTransform:"uppercase", letterSpacing:1, marginBottom:8 }}>Recaudación hasta ahora</div>
                {[
                  { label:"💵 Efectivo", value:efectivoCorte, bg:C.mentaPale, color:"#27ae60" },
                  { label:"💳 Tarjeta / Débito", value:tarjetaCorte, bg:"#e8f0fe", color:"#2d5fa8" },
                  { label:"📱 QR / Transferencia", value:qrCorte, bg:C.violetaPale, color:C.violeta },
                ].map((row,i) => (
                  <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"9px 12px", background:row.bg, borderRadius:10, marginBottom:6 }}>
                    <span style={{ fontWeight:700, fontSize:13 }}>{row.label}</span>
                    <span style={{ fontWeight:900, fontSize:15, color:row.color }}>{fmt(row.value)}</span>
                  </div>
                ))}
              </div>

              {/* Total + ventas */}
              <div style={{ borderTop:`2px dashed ${C.violetaLight}`, paddingTop:12, marginBottom:4 }}>
                <div style={{ display:"flex", justifyContent:"space-between", fontWeight:900, fontSize:18, color:C.violeta, marginBottom:4 }}>
                  <span>TOTAL ACUMULADO</span><span>{fmt(totalCorte)}</span>
                </div>
                <div style={{ fontSize:12, color:"#aaa" }}>{ventasCaja.length} venta{ventasCaja.length !== 1 ? "s" : ""} realizadas</div>
                {caja.montoInicial > 0 && (
                  <div style={{ display:"flex", justifyContent:"space-between", fontWeight:800, fontSize:13, color:"#27ae60", marginTop:8, background:C.mentaPale, padding:"8px 12px", borderRadius:10 }}>
                    <span>💵 Efectivo físico en caja</span>
                    <span>{fmt(efectivoCorte + caja.montoInicial)}</span>
                  </div>
                )}
              </div>

              <div style={{ textAlign:"center", fontSize:11, color:C.violetaLight, fontWeight:700, margin:"12px 0 16px" }}>
                ⚠️ Corte parcial — el turno continúa abierto
              </div>

              <div style={{ display:"flex", gap:10 }}>
                <button onClick={() => setMostrarCorte(false)}
                  style={{ flex:1, padding:"11px", borderRadius:12, border:`2px solid ${C.violetaLight}`, background:C.blanco, cursor:"pointer", fontWeight:700, fontFamily:"Nunito, sans-serif" }}>
                  Cerrar
                </button>
                <button onClick={imprimirTicket}
                  style={{ flex:2, padding:"11px", borderRadius:12, border:"none", background:C.violeta, color:C.blanco, fontWeight:800, cursor:"pointer", fontFamily:"Nunito, sans-serif", fontSize:14 }}>
                  🖨️ Imprimir corte
                </button>
              </div>
            </div>

            {/* Versión impresión térmica corte parcial */}
            <div id="ticket-print-hidden" style={{ display:"none" }}>
              <div className="ticket-title">VENECIA</div>
              <div className="ticket-subtitle">Helados Artesanales</div>
              <div className="ticket-subtitle">{sesion.sucursal.nombre}</div>
              <hr className="ticket-divider" />
              <div className="ticket-title" style={{ fontSize:13 }}>CORTE PARCIAL</div>
              <div className="ticket-subtitle">{fechaLegible(hoy())}  {horaCorte}</div>
              <div className="ticket-subtitle">Empleada: {sesion.usuario.nombre}</div>
              <div className="ticket-subtitle">Apertura: {caja.horaApertura}  Corte: {horaCorte}</div>
              <hr className="ticket-divider" />
              <div style={{ fontWeight:"bold", fontSize:11 }}>RECAUDACION HASTA AHORA:</div>
              <div className="ticket-row"><span>Efectivo</span><span>{fmt(efectivoCorte)}</span></div>
              <div className="ticket-row"><span>Tarjeta / Debito</span><span>{fmt(tarjetaCorte)}</span></div>
              <div className="ticket-row"><span>QR / Transferencia</span><span>{fmt(qrCorte)}</span></div>
              <hr className="ticket-divider" />
              {caja.montoInicial > 0 && (
                <div className="ticket-row"><span>Fondo inicial:</span><span>{fmt(caja.montoInicial)}</span></div>
              )}
              <div className="ticket-total">TOTAL: {fmt(totalCorte)}</div>
              {caja.montoInicial > 0 && (
                <div className="ticket-highlight">
                  <div className="ticket-row-bold"><span>EFECTIVO EN CAJA:</span><span>{fmt(efectivoCorte + caja.montoInicial)}</span></div>
                </div>
              )}
              <hr className="ticket-divider" />
              <div className="ticket-center">{ventasCaja.length} ventas en el turno</div>
              <div className="ticket-center">** TURNO CONTINUA ABIERTO **</div>
              <hr className="ticket-divider" />
              <div className="ticket-center">Venecia Helados Artesanales</div>
              <div className="ticket-center"> </div>
              <div className="ticket-center"> </div>
            </div>
          </div>
        );
      })()}

      {/* Modal retiro */}
      {mostrarRetiro && (
        <div style={{ position:"fixed", inset:0, background:"rgba(45,21,89,0.75)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:999, padding:20 }}>
          <div style={{ background:C.blanco, borderRadius:20, padding:"28px 24px", maxWidth:360, width:"100%", fontFamily:"Nunito, sans-serif", boxShadow:"0 24px 60px rgba(91,45,142,0.4)" }}>
            <div style={{ textAlign:"center", marginBottom:20 }}>
              <div style={{ fontSize:40 }}>💸</div>
              <h3 style={{ margin:"8px 0 4px", color:C.violeta, fontFamily:"Baloo 2, cursive", fontSize:20 }}>Retiro de caja</h3>
              <p style={{ color:"#888", fontSize:12, margin:0 }}>El retiro no descuenta del total de ventas</p>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:12, marginBottom:20 }}>
              <div>
                <label style={{ fontSize:11, color:C.violeta, fontWeight:800, display:"block", marginBottom:5, textTransform:"uppercase" }}>Motivo del retiro</label>
                <input
                  type="text"
                  value={retiroMotivo}
                  onChange={function(e) { setRetiroMotivo(e.target.value); }}
                  placeholder="Ej: pago cadete, compra insumos..."
                  style={{ width:"100%", padding:"11px 14px", borderRadius:12, border:"2px solid " + C.violetaLight, fontSize:14, fontFamily:"Nunito, sans-serif", fontWeight:600, boxSizing:"border-box", outline:"none" }}
                />
              </div>
              <div>
                <label style={{ fontSize:11, color:C.violeta, fontWeight:800, display:"block", marginBottom:5, textTransform:"uppercase" }}>Monto ($)</label>
                <input
                  type="number"
                  value={retiroMonto}
                  onChange={function(e) { setRetiroMonto(e.target.value); }}
                  placeholder="0"
                  style={{ width:"100%", padding:"11px 14px", borderRadius:12, border:"2px solid " + C.violetaLight, fontSize:18, fontFamily:"Nunito, sans-serif", fontWeight:900, color:C.violeta, boxSizing:"border-box", outline:"none", textAlign:"center" }}
                />
              </div>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={function() { setMostrarRetiro(false); setRetiroMonto(""); setRetiroMotivo(""); }}
                style={{ flex:1, padding:"11px", borderRadius:12, border:"2px solid " + C.violetaLight, background:C.blanco, cursor:"pointer", fontWeight:700, fontFamily:"Nunito, sans-serif" }}>
                Cancelar
              </button>
              <button onClick={guardarRetiro}
                style={{ flex:2, padding:"11px", borderRadius:12, border:"none", background:C.violeta, color:C.blanco, fontWeight:800, cursor:"pointer", fontFamily:"Nunito, sans-serif", fontSize:14 }}>
                Registrar retiro
              </button>
            </div>
            {retirosCaja.length > 0 && (
              <div style={{ marginTop:16, paddingTop:12, borderTop:"1px solid " + C.violetaPale }}>
                <div style={{ fontSize:11, color:C.violetaMed, fontWeight:800, textTransform:"uppercase", marginBottom:6 }}>Retiros anteriores este turno</div>
                {retirosCaja.map(function(r) {
                  return (
                    <div key={r.id} style={{ display:"flex", justifyContent:"space-between", fontSize:12, padding:"4px 0", borderBottom:"1px solid " + C.crema }}>
                      <span style={{ color:"#555" }}>{r.hora} · {r.motivo}</span>
                      <span style={{ fontWeight:800, color:"#e74c3c" }}>{fmt(r.monto)}</span>
                    </div>
                  );
                })}
                <div style={{ display:"flex", justifyContent:"space-between", fontWeight:900, fontSize:13, color:"#e74c3c", marginTop:6 }}>
                  <span>Total retirado</span><span>{fmt(totalRetiros)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal confirmación cierre */}
      {mostrarCierre && (
        <div style={{ position:"fixed", inset:0, background:"rgba(45,21,89,0.75)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:999, padding:20 }}>
          <div style={{ background:C.blanco, borderRadius:20, padding:"32px 28px", maxWidth:380, width:"100%", fontFamily:"Nunito, sans-serif", boxShadow:"0 24px 60px rgba(91,45,142,0.4)", textAlign:"center" }}>
            <div style={{ fontSize:48, marginBottom:12 }}>🔒</div>
            <h3 style={{ margin:"0 0 8px", color:C.violeta, fontFamily:"Baloo 2, cursive", fontSize:22 }}>Cerrar caja</h3>
            <p style={{ color:"#888", fontSize:13, marginBottom:20 }}>¿Confirmás el cierre de tu turno? Se generará el ticket de cierre.</p>
            <div style={{ background:C.violetaPale, borderRadius:14, padding:"14px 18px", marginBottom:20, textAlign:"left" }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, marginBottom:6 }}>
                <span style={{ color:"#777" }}>Ventas del turno</span>
                <span style={{ fontWeight:800, color:C.violeta }}>{ventasCaja.length}</span>
              </div>
              {[
                { label:"💵 Efectivo", key:"efectivo", color:"#27ae60" },
                { label:"💳 Tarjeta", key:"tarjeta", color:"#2980b9" },
                { label:"📱 QR", key:"qr", color:C.violeta },
                { label:"👤 Consumo empleado", key:"consumo", color:"#7d3c98" },
              ].map(function(fp) {
                var subtotal = ventasCaja.filter(function(v) { return v.formaPago === fp.key; }).reduce(function(s,v) { return s+v.total; }, 0);
                return (
                  <div key={fp.key} style={{ display:"flex", justifyContent:"space-between", fontSize:13, marginBottom:6 }}>
                    <span style={{ color:"#777" }}>{fp.label}</span>
                    <span style={{ fontWeight:800, color:fp.color }}>{fmt(subtotal)}</span>
                  </div>
                );
              })}
              {retirosCaja.length > 0 && (
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, marginBottom:6, paddingTop:6, borderTop:"1px dashed " + C.violetaLight }}>
                  <span style={{ color:"#e74c3c" }}>💸 Retiros de caja</span>
                  <span style={{ fontWeight:800, color:"#e74c3c" }}>({fmt(totalRetiros)})</span>
                </div>
              )}
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:16, fontWeight:900, borderTop:"2px solid " + C.violetaLight, paddingTop:10, color:C.violeta }}>
                <span>TOTAL VENTAS</span><span>{fmt(totalCaja)}</span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, fontWeight:800, color:"#27ae60", marginTop:6, background:C.mentaPale, padding:"8px 10px", borderRadius:8 }}>
                <span>💵 Efectivo fisico estimado</span>
                <span>{fmt(ventasCaja.filter(function(v){return v.formaPago==="efectivo";}).reduce(function(s,v){return s+v.total;},0) - totalRetiros + caja.montoInicial)}</span>
              </div>
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => setMostrarCierre(false)} style={{ flex:1, padding:"11px", borderRadius:12, border:`2px solid ${C.violetaLight}`, background:C.blanco, cursor:"pointer", fontWeight:700, fontFamily:"Nunito, sans-serif" }}>Cancelar</button>
              <button onClick={handleCerrarCaja} style={{ flex:2, padding:"11px", borderRadius:12, border:"none", background:C.violeta, color:C.blanco, fontWeight:800, cursor:"pointer", fontFamily:"Nunito, sans-serif", fontSize:14 }}>Confirmar cierre</button>
            </div>
          </div>
        </div>
      )}

      {/* Ticket de cierre */}
      {ticketCierre && (
        <TicketCierre
          caja={ticketCierre}
          sucursal={sesion.sucursal.nombre}
          onClose={() => { setTicketCierre(null); onCerrarCaja(); }}
        />
      )}
    </div>
  );
}

// ─── ADMIN ────────────────────────────────────────────────────────────────────
function Admin({ data, setData, onLogout }) {
  const [tab, setTab] = useState("dashboard");
  const [menuAbierto, setMenuAbierto] = useState(false);

  const tabs = [
    { key: "dashboard", icon: "📊", label: "Dashboard" },
    { key: "ventas", icon: "📋", label: "Ventas" },
    { key: "resultados", icon: "💰", label: "Resultados" },
    { key: "caja", icon: "🏪", label: "Caja" },
    { key: "consumos", icon: "👤", label: "Consumos" },
    { key: "retiros", icon: "💸", label: "Retiros" },
    { key: "productos", icon: "🍦", label: "Productos" },
    { key: "usuarios", icon: "👥", label: "Usuarios" },
  ];

  var tabActual = tabs.find(function(t) { return t.key === tab; });

  return (
    <div style={{ minHeight:"100vh", background:C.crema, fontFamily:"Nunito, sans-serif" }}>
      <style>{FONTS}{MOBILE_TABLE_CSS}
        {`
          @media (min-width: 768px) {
            .admin-layout { display: flex !important; }
            .admin-sidebar { display: flex !important; }
            .admin-topbar { display: none !important; }
            .admin-content { padding: 24px !important; }
          }
          @media (max-width: 767px) {
            .admin-layout { display: block !important; }
            .admin-sidebar { display: none !important; }
            .admin-topbar { display: flex !important; }
            .admin-content { padding: 12px !important; overflow-x: hidden !important; }
            .overflow-x-auto { overflow-x: auto !important; -webkit-overflow-scrolling: touch !important; }
          }
          .admin-layout { display: flex; }
          .admin-sidebar { display: flex; }
          .admin-topbar { display: none; }
          .admin-content { padding: 24px; }
          * { box-sizing: border-box; }
          table { min-width: 100%; }
        `}
      </style>

      {/* TOP BAR MOBILE */}
      <div className="admin-topbar" style={{ background:C.violeta, padding:"10px 16px", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:50, boxShadow:"0 2px 8px rgba(0,0,0,0.2)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <button onClick={function(){ setMenuAbierto(!menuAbierto); }}
            style={{ background:"rgba(255,255,255,0.15)", border:"none", borderRadius:8, padding:"6px 10px", cursor:"pointer", color:"white", fontSize:18 }}>
            ☰
          </button>
          <div style={{ color:"white", fontWeight:900, fontSize:16, fontFamily:"Baloo 2, cursive" }}>
            {tabActual ? tabActual.icon + " " + tabActual.label : "Venecia"}
          </div>
        </div>
        <Logo size={32} dark />
      </div>

      {/* MENU MOBILE DESPLEGABLE */}
      {menuAbierto && (
        <div style={{ position:"fixed", inset:0, zIndex:100 }}>
          <div onClick={function(){ setMenuAbierto(false); }}
            style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.5)" }} />
          <div style={{ position:"absolute", left:0, top:0, bottom:0, width:240, background:C.violeta, display:"flex", flexDirection:"column", boxShadow:"4px 0 20px rgba(0,0,0,0.3)" }}>
            <div style={{ padding:"20px 16px 12px", borderBottom:"1px solid rgba(255,255,255,0.1)" }}>
              <Logo size={40} dark />
              <div style={{ marginTop:8, background:"rgba(255,255,255,0.12)", borderRadius:8, padding:"4px 10px", display:"inline-block" }}>
                <div style={{ color:C.amarillo, fontSize:10, fontWeight:800, letterSpacing:1 }}>PANEL ADMIN</div>
              </div>
            </div>
            <nav style={{ flex:1, padding:"8px 0", overflowY:"auto" }}>
              {tabs.map(function(t) {
                return (
                  <button key={t.key} onClick={function(){ setTab(t.key); setMenuAbierto(false); }}
                    style={{ width:"100%", padding:"13px 16px", background: tab===t.key ? "rgba(255,255,255,0.15)" : "transparent",
                      border:"none", borderLeft: tab===t.key ? "4px solid " + C.amarillo : "4px solid transparent",
                      color: tab===t.key ? "white" : "rgba(255,255,255,0.7)",
                      textAlign:"left", cursor:"pointer", fontSize:15, fontWeight: tab===t.key ? 800 : 600,
                      fontFamily:"Nunito, sans-serif", display:"flex", alignItems:"center", gap:10 }}>
                    <span>{t.icon}</span> {t.label}
                  </button>
                );
              })}
            </nav>
            <div style={{ padding:12, borderTop:"1px solid rgba(255,255,255,0.1)" }}>
              <button onClick={onLogout} style={{ width:"100%", padding:"10px", borderRadius:10, border:"2px solid rgba(255,255,255,0.3)", background:"transparent", color:"rgba(255,255,255,0.8)", cursor:"pointer", fontFamily:"Nunito, sans-serif", fontWeight:700 }}>
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="admin-layout">
        {/* SIDEBAR DESKTOP */}
        <div className="admin-sidebar" style={{ width:230, background:C.violeta, flexDirection:"column", position:"relative", overflow:"hidden", flexShrink:0, minHeight:"100vh" }}>
          <Blob color={C.amarillo} style={{ width:180, height:180, top:-60, right:-60, opacity:0.2 }} />
          <Blob color={C.rosa} style={{ width:140, height:140, bottom:40, left:-50, opacity:0.2 }} />
          <div style={{ padding:"28px 20px 20px", borderBottom:"1px solid rgba(255,255,255,0.12)", position:"relative" }}>
            <Logo size={44} dark />
            <div style={{ marginTop:10, background:"rgba(255,255,255,0.12)", borderRadius:10, padding:"6px 12px" }}>
              <div style={{ color:C.amarillo, fontSize:11, fontWeight:800, letterSpacing:1 }}>PANEL ADMIN</div>
            </div>
          </div>
          <nav style={{ flex:1, padding:"14px 10px", position:"relative" }}>
            {tabs.map(function(t) {
              return (
                <button key={t.key} onClick={function(){ setTab(t.key); }}
                  style={{ width:"100%", padding:"11px 14px", marginBottom:4,
                    background: tab===t.key ? "rgba(255,255,255,0.15)" : "transparent",
                    border:"none", borderRadius:12,
                    borderLeft: tab===t.key ? "4px solid " + C.amarillo : "4px solid transparent",
                    color: tab===t.key ? "white" : "rgba(255,255,255,0.6)",
                    textAlign:"left", cursor:"pointer", fontSize:14,
                    fontWeight: tab===t.key ? 800 : 600,
                    fontFamily:"Nunito, sans-serif", transition:"all 0.2s",
                    display:"flex", alignItems:"center", gap:10 }}>
                  <span>{t.icon}</span> {t.label}
                </button>
              );
            })}
          </nav>
          <div style={{ padding:16, borderTop:"1px solid rgba(255,255,255,0.1)", position:"relative" }}>
            <button onClick={onLogout} style={{ width:"100%", padding:"10px", borderRadius:12, border:"2px solid rgba(255,255,255,0.25)", background:"transparent", color:"rgba(255,255,255,0.7)", cursor:"pointer", fontSize:13, fontFamily:"Nunito, sans-serif", fontWeight:700 }}>
              Cerrar sesión
            </button>
          </div>
        </div>

        {/* CONTENIDO */}
        <div className="admin-content" style={{ flex:1, overflowY:"auto", overflowX:"hidden", maxWidth:"100%" }}>
          {tab === "dashboard" && <Dashboard data={data} />}
          {tab === "ventas" && <TabVentas data={data} setData={setData} />}
          {tab === "resultados" && <TabResultados data={data} />}
          {tab === "caja" && <TabCaja data={data} />}
          {tab === "consumos" && <TabConsumos data={data} setData={setData} />}
          {tab === "retiros" && <TabRetiros data={data} setData={setData} />}
          {tab === "productos" && <TabProductos data={data} setData={setData} />}
          {tab === "usuarios" && <TabUsuarios data={data} setData={setData} />}
        </div>
      </div>
    </div>
  );
}

// ─── COMPONENTES ADMIN COMPARTIDOS ───────────────────────────────────────────
const SectionTitle = ({ children }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
    <div style={{ width: 6, height: 28, background: C.violeta, borderRadius: 3 }} />
    <h2 style={{ margin: 0, color: C.violeta, fontFamily: "Baloo 2, cursive", fontSize: 24 }}>{children}</h2>
  </div>
);

const Card = ({ children, style = {} }) => (
  <div style={{ background: C.blanco, borderRadius: 18, padding: 20, boxShadow: "0 4px 16px rgba(91,45,142,0.08)", ...style }}>
    {children}
  </div>
);

const StatCard = ({ label, value, sub, color, icon }) => (
  <Card style={{ borderTop: `4px solid ${color}`, position: "relative", overflow: "hidden" }}>
    <div style={{ position: "absolute", top: -15, right: -10, fontSize: 50, opacity: 0.08 }}>{icon}</div>
    <div style={{ fontSize: 11, color: "#999", fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{label}</div>
    <div style={{ fontSize: 24, fontWeight: 900, color, fontFamily: "Baloo 2, cursive" }}>{value}</div>
    <div style={{ fontSize: 12, color: "#aaa", marginTop: 4, fontWeight: 600 }}>{sub}</div>
  </Card>
);

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ data }) {
  const primerDia = data.ventas.length > 0
    ? [...data.ventas].sort((a,b) => a.fecha.localeCompare(b.fecha))[0].fecha
    : hoy();
  const [desde, setDesde] = useState(hoy());
  const [hasta, setHasta] = useState(hoy());
  const [horaDesde, setHoraDesde] = useState("");
  const [horaHasta, setHoraHasta] = useState("");
  const [sucFiltro, setSucFiltro] = useState("");

  const setAtajo = (tipo) => {
    const hoyStr = hoy();
    setHoraDesde(""); setHoraHasta("");
    if (tipo === "hoy") { setDesde(hoyStr); setHasta(hoyStr); }
    else if (tipo === "ayer") {
      const ayer = new Date(); ayer.setDate(ayer.getDate()-1);
      const s = ayer.toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }); setDesde(s); setHasta(s);
    }
    else if (tipo === "semana") {
      const lunes = new Date(); lunes.setDate(lunes.getDate() - (lunes.getDay() === 0 ? 6 : lunes.getDay() - 1));
      setDesde(lunes.toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" })); setHasta(hoyStr);
    }
    else if (tipo === "mes") { setDesde(hoyStr.slice(0,7)+"-01"); setHasta(hoyStr); }
    else if (tipo === "todo") { setDesde(primerDia); setHasta(hoyStr); }
  };

  const ventasSuc = data.ventas.filter(v => (!sucFiltro || v.sucursal_id === Number(sucFiltro)));
  const ventasPorFecha = ventasSuc.filter(v => v.fecha >= desde && v.fecha <= hasta);
  const ventasFiltradas = horaDesde || horaHasta
    ? filtrarPorHora(ventasSuc, horaDesde, horaHasta, desde, hasta)
    : ventasPorFecha;

  const brutoPeriodo   = ventasFiltradas.reduce((s,v) => s + (v.items || []).reduce((a,i) => a + (i.subtotal || 0), 0), 0);
  const totalPeriodo   = brutoPeriodo;
  const costoPeriodo   = ventasFiltradas.reduce((s,v) => s + v.costo_total, 0);
  const gananciaPeriodo = brutoPeriodo - costoPeriodo;
  const margenPeriodo  = brutoPeriodo > 0 ? ((gananciaPeriodo/brutoPeriodo)*100).toFixed(1) : 0;

  const porSucursal = data.sucursales.map(s => {
    const vs = ventasFiltradas.filter(v => v.sucursal_id === s.id);
    return { nombre: s.nombre, total: vs.reduce((a,v) => a + (v.items || []).reduce((x,i) => x + (i.subtotal || 0), 0), 0), cantidad: vs.length };
  });
  const ultimas = [...ventasFiltradas].sort((a,b) => b.id - a.id).slice(0, 8);

  // Gráfico ventas por hora (0-23)
  const ventasPorHora = Array.from({length:24}, (_,h) => {
    const label = String(h).padStart(2,"0") + ":00";
    const vs = ventasFiltradas.filter(v => v.hora && parseInt(v.hora.split(":")[0]) === h);
    return { hora: label, total: vs.reduce((s,v) => s + (v.items || []).reduce((a,i) => a + (i.subtotal || 0), 0), 0), cantidad: vs.length };
  }).filter(h => h.total > 0 || ventasFiltradas.some(v => v.hora && parseInt(v.hora.split(":")[0]) === parseInt(h.hora)));
  const horasConVentas = Array.from({length:24}, (_,h) => {
    const vs = ventasFiltradas.filter(v => v.hora && parseInt(v.hora.split(":")[0]) === h);
    return { hora: String(h).padStart(2,"0")+":00", total: vs.reduce((s,v) => s + (v.items || []).reduce((a,i) => a + (i.subtotal || 0), 0), 0), cantidad: vs.length };
  });
  const maxHora = Math.max(...horasConVentas.map(h => h.total), 1);

  const filtroStyle = { padding:"7px 10px", borderRadius:10, border:`2px solid ${C.violetaLight}`, fontSize:12, fontFamily:"Nunito, sans-serif", fontWeight:600, color:C.dark, outline:"none", background:C.blanco };

  return (
    <div>
      <SectionTitle>Dashboard</SectionTitle>

      {/* Filtros */}
      <Card style={{ marginBottom:16, padding:"14px 18px" }}>
        <div style={{ display:"flex", flexWrap:"wrap", gap:8, alignItems:"center" }}>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {[{key:"hoy",label:"Hoy"},{key:"ayer",label:"Ayer"},{key:"semana",label:"Semana"},{key:"mes",label:"Mes"},{key:"todo",label:"Todo"}].map(a => (
              <button key={a.key} onClick={() => setAtajo(a.key)}
                style={{ padding:"6px 12px", borderRadius:20, border:"none", cursor:"pointer", fontSize:12, fontWeight:800, fontFamily:"Nunito, sans-serif", background:C.violetaPale, color:C.violeta }}>
                {a.label}
              </button>
            ))}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
            <span style={{ fontSize:11, color:C.violetaMed, fontWeight:700 }}>📅 Desde</span>
            <input type="date" value={desde} onChange={e => setDesde(e.target.value)} style={filtroStyle} />
            <span style={{ fontSize:11, color:C.violetaMed, fontWeight:700 }}>Hasta</span>
            <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} style={filtroStyle} />
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
            <span style={{ fontSize:11, color:C.violetaMed, fontWeight:700 }}>🕐 Hora</span>
            <input type="time" value={horaDesde} onChange={e => setHoraDesde(e.target.value)} style={{ padding:"8px 12px", borderRadius:10, border:"2px solid " + C.violetaLight, fontSize:13, fontWeight:600, color:C.dark, outline:"none", background:C.blanco, width:100 }} />
            <span style={{ fontSize:11, color:C.violetaMed, fontWeight:700 }}>a</span>
            <input type="time" value={horaHasta} onChange={e => setHoraHasta(e.target.value)} style={{ padding:"8px 12px", borderRadius:10, border:"2px solid " + C.violetaLight, fontSize:13, fontWeight:600, color:C.dark, outline:"none", background:C.blanco, width:100 }} />
            {(horaDesde || horaHasta) && (
              <button onClick={() => {setHoraDesde(""); setHoraHasta("");}}
                style={{ padding:"5px 10px", borderRadius:8, border:"none", background:"#ffe8e8", color:"#c0392b", cursor:"pointer", fontSize:11, fontWeight:800, fontFamily:"Nunito, sans-serif" }}>
                ✕ Hora
              </button>
            )}
          </div>
          <select value={sucFiltro} onChange={e => setSucFiltro(e.target.value)} style={filtroStyle}>
            <option value="">Ambas sucursales</option>
            {data.sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        </div>
        {(horaDesde || horaHasta) && (
          <div style={{ marginTop:8, fontSize:12, color:C.violetaMed, fontWeight:600 }}>
            🕐 Filtrando de {horaDesde || "00:00"} a {horaHasta || "23:59"} · {ventasFiltradas.length} ventas en ese horario
          </div>
        )}
      </Card>

      {/* Tarjetas */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(150px, 1fr))", gap:10, marginBottom:16 }}>
        <StatCard label="Total vendido"   value={fmt(totalPeriodo)}    sub={`${ventasFiltradas.length} transacciones`} color={C.violeta} icon="🍦" />
        <StatCard label="Costo de ventas" value={fmt(costoPeriodo)}    sub="Mercadería vendida"  color="#e74c3c" icon="📦" />
        <StatCard label="Ganancia bruta"  value={fmt(gananciaPeriodo)} sub={`Margen: ${margenPeriodo}%`} color="#27ae60" icon="💰" />
        <StatCard label="Ticket promedio" value={ventasFiltradas.length > 0 ? fmt(Math.round(totalPeriodo/ventasFiltradas.length)) : "$0"} sub="Por venta" color="#2980b9" icon="🧾" />
      </div>

      {/* Gráfico por hora */}
      <Card style={{ marginBottom:16 }}>
        <h4 style={{ margin:"0 0 16px", color:C.violeta, fontFamily:"Baloo 2, cursive" }}>
          Ventas por hora del período
          {ventasFiltradas.length === 0 && <span style={{ fontSize:12, color:"#aaa", fontWeight:400, marginLeft:8 }}>sin datos</span>}
        </h4>
        {ventasFiltradas.length === 0 ? (
          <div style={{ textAlign:"center", padding:"24px 0", color:C.violetaLight, fontSize:13, fontWeight:700 }}>
            Cargá ventas para ver el gráfico 🍦
          </div>
        ) : (
          <div>
            <div style={{ display:"flex", alignItems:"flex-end", gap:4, height:120, paddingBottom:24, position:"relative", borderBottom:`2px solid ${C.violetaPale}` }}>
              {horasConVentas.filter(h => {
                // Mostrar solo horas con actividad ±1 hora alrededor
                const activas = horasConVentas.reduce((arr, hh, idx) => { if(hh.total > 0) arr.push(idx); return arr; }, []);
                if (activas.length === 0) return true;
                const minH = Math.max(0, Math.min(...activas) - 1);
                const maxH = Math.min(23, Math.max(...activas) + 1);
                const idx = horasConVentas.indexOf(h);
                return idx >= minH && idx <= maxH;
              }).map((h, i, arr) => {
                const pct = maxHora > 0 ? (h.total / maxHora) * 100 : 0;
                return (
                  <div key={h.hora} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", height:"100%", justifyContent:"flex-end", position:"relative", minWidth:0 }}>
                    {h.total > 0 && (
                      <div style={{ position:"absolute", top:-18, fontSize:9, fontWeight:800, color:C.violeta, whiteSpace:"nowrap" }}>
                        {fmt(h.total)}
                      </div>
                    )}
                    <div style={{
                      width:"70%", borderRadius:"4px 4px 0 0",
                      height:`${Math.max(pct, h.total > 0 ? 4 : 0)}%`,
                      background: h.total > 0
                        ? `linear-gradient(180deg, ${C.violetaMed}, ${C.violeta})`
                        : C.violetaPale,
                      transition:"height 0.4s ease",
                      position:"relative",
                    }} />
                    {h.cantidad > 0 && (
                      <div style={{ position:"absolute", bottom:-20, fontSize:9, color:"#888", fontWeight:600, whiteSpace:"nowrap" }}>
                        {h.hora.slice(0,5)}
                        <br/>
                        <span style={{ color:C.violeta, fontWeight:800 }}>{h.cantidad}v</span>
                      </div>
                    )}
                    {h.cantidad === 0 && (
                      <div style={{ position:"absolute", bottom:-20, fontSize:9, color:"#ddd", whiteSpace:"nowrap" }}>{h.hora.slice(0,5)}</div>
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop:24, display:"flex", gap:16, flexWrap:"wrap" }}>
              {horasConVentas.filter(h => h.total > 0).sort((a,b) => b.total - a.total).slice(0,3).map((h,i) => (
                <div key={h.hora} style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <span style={{ fontSize:12 }}>{i===0?"🥇":i===1?"🥈":"🥉"}</span>
                  <span style={{ fontSize:12, fontWeight:800, color:C.violeta }}>{h.hora}</span>
                  <span style={{ fontSize:12, color:"#888" }}>{fmt(h.total)} · {h.cantidad} venta{h.cantidad > 1?"s":""}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))", gap:14 }}>
        <Card>
          <h4 style={{ margin:"0 0 14px", color:C.violeta, fontFamily:"Baloo 2, cursive" }}>Ventas por sucursal</h4>
          {porSucursal.map((s,i) => (
            <div key={i} style={{ marginBottom:14 }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, marginBottom:5 }}>
                <span style={{ fontWeight:800, color:C.dark }}>{s.nombre}</span>
                <span style={{ color:C.violeta, fontWeight:900 }}>{fmt(s.total)}</span>
              </div>
              <div style={{ background:C.violetaPale, borderRadius:6, height:8, overflow:"hidden" }}>
                <div style={{ width:totalPeriodo > 0 ? ((s.total/totalPeriodo)*100) + "%" : "0%", background:`linear-gradient(90deg, ${C.violeta}, ${C.violetaMed})`, borderRadius:6, height:"100%", transition:"width 0.6s ease" }} />
              </div>
              <div style={{ fontSize:11, color:"#aaa", marginTop:3, fontWeight:600 }}>{s.cantidad} ventas</div>
            </div>
          ))}
        </Card>

        <Card>
          <h4 style={{ margin:"0 0 14px", color:C.violeta, fontFamily:"Baloo 2, cursive" }}>Últimas ventas del período</h4>
          {ultimas.length === 0 ? (
            <div style={{ textAlign:"center", color:C.violetaLight, padding:20 }}>
              <div style={{ fontSize:32 }}>🍦</div>
              <p style={{ fontSize:13, fontWeight:700 }}>Sin ventas aún</p>
            </div>
          ) : ultimas.map((v,i) => (
            <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"7px 0", borderBottom:`1px solid ${C.violetaPale}` }}>
              <div>
                <div style={{ fontWeight:800, fontSize:13, color:C.dark }}>{v.usuario_nombre}</div>
                <div style={{ fontSize:11, color:"#aaa" }}>{v.fecha} {v.hora} · {(data.sucursales.find(s => s.id === v.sucursal_id) || {}).nombre}</div>
              </div>
              <span style={{ fontWeight:900, color:"#27ae60", fontSize:14 }}>{fmt(v.total)}</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}


// ─── TAB VENTAS ───────────────────────────────────────────────────────────────
function TabVentas({ data }) {
  const primerDia = data.ventas.length > 0
    ? [...data.ventas].sort((a,b) => a.fecha.localeCompare(b.fecha))[0].fecha
    : hoy();
  const [desde, setDesde] = useState(hoy());
  const [hasta, setHasta] = useState(hoy());
  const [horaDesde, setHoraDesde] = useState("");
  const [horaHasta, setHoraHasta] = useState("");
  const [filtroSuc, setFiltroSuc] = useState("");
  const [ventaDetalle, setVentaDetalle] = useState(null);
  const [ventaEditando, setVentaEditando] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editCat, setEditCat] = useState("productos");

  const setAtajo = (tipo) => {
    const hoyStr = hoy();
    if (tipo === "hoy") { setDesde(hoyStr); setHasta(hoyStr); }
    else if (tipo === "ayer") {
      const ayer = new Date(); ayer.setDate(ayer.getDate()-1);
      const ayerStr = ayer.toISOString().slice(0,10);
      setDesde(ayerStr); setHasta(ayerStr);
    }
    else if (tipo === "semana") {
      const lunes = new Date(); lunes.setDate(lunes.getDate() - (lunes.getDay() === 0 ? 6 : lunes.getDay() - 1));
      setDesde(lunes.toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" })); setHasta(hoyStr);
    }
    else if (tipo === "mes") { setDesde(hoyStr.slice(0,7) + "-01"); setHasta(hoyStr); }
    else if (tipo === "todo") { setDesde(primerDia); setHasta(hoyStr); }
  };

  const ventasSuc = data.ventas.filter(v => (!filtroSuc || v.sucursal_id === Number(filtroSuc)));
  const ventasPorFecha = ventasSuc.filter(v => v.fecha >= desde && v.fecha <= hasta);
  const ventasFiltradas = (horaDesde || horaHasta
    ? filtrarPorHora(ventasSuc, horaDesde, horaHasta, desde, hasta)
    : ventasPorFecha
  ).sort((a,b) => b.id - a.id);
  const totalFiltrado = ventasFiltradas.reduce((s, v) => s + v.total, 0);
  const costoFiltrado = ventasFiltradas.reduce((s, v) => s + v.costo_total, 0);

  const filtroStyle = { padding: "8px 12px", borderRadius: 10, border: `2px solid ${C.violetaLight}`, fontSize: 13, fontFamily: "Nunito, sans-serif", fontWeight: 600, color: C.dark, outline: "none", background: C.blanco };

  return (
    <div>
      <SectionTitle>Ventas</SectionTitle>

      <Card style={{ marginBottom: 14, padding: "14px 18px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[
              { key: "hoy", label: "Hoy" },
              { key: "ayer", label: "Ayer" },
              { key: "semana", label: "Esta semana" },
              { key: "mes", label: "Este mes" },
              { key: "todo", label: "Todo" },
            ].map((a) => (
              <button key={a.key} onClick={() => setAtajo(a.key)}
                style={{ padding: "6px 14px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 800, fontFamily: "Nunito, sans-serif", background: C.violetaPale, color: C.violeta }}>
                {a.label}
              </button>
            ))}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
            <span style={{ fontSize:11, color:C.violetaMed, fontWeight:700 }}>📅 Desde</span>
            <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} style={filtroStyle} />
            <span style={{ fontSize:11, color:C.violetaMed, fontWeight:700 }}>Hasta</span>
            <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} style={filtroStyle} />
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
            <span style={{ fontSize:11, color:C.violetaMed, fontWeight:700 }}>🕐 Hora</span>
            <input type="time" value={horaDesde} onChange={e => setHoraDesde(e.target.value)} style={{ padding:"8px 12px", borderRadius:10, border:"2px solid " + C.violetaLight, fontSize:13, fontWeight:600, color:C.dark, outline:"none", background:C.blanco, width:95 }} />
            <span style={{ fontSize:11, color:C.violetaMed, fontWeight:700 }}>a</span>
            <input type="time" value={horaHasta} onChange={e => setHoraHasta(e.target.value)} style={{ padding:"8px 12px", borderRadius:10, border:"2px solid " + C.violetaLight, fontSize:13, fontWeight:600, color:C.dark, outline:"none", background:C.blanco, width:95 }} />
            {(horaDesde || horaHasta) && (
              <button onClick={() => { setHoraDesde(""); setHoraHasta(""); }}
                style={{ padding:"5px 8px", borderRadius:8, border:"none", background:"#ffe8e8", color:"#c0392b", cursor:"pointer", fontSize:11, fontWeight:800 }}>✕ Hora</button>
            )}
          </div>
          <select value={filtroSuc} onChange={(e) => setFiltroSuc(e.target.value)} style={filtroStyle}>
            <option value="">Ambas sucursales</option>
            {data.sucursales.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        </div>
        {(horaDesde || horaHasta) && (
          <div style={{ marginTop:8, fontSize:12, color:C.violetaMed, fontWeight:600 }}>
            🕐 Mostrando ventas de {horaDesde||"00:00"} a {horaHasta||"23:59"} · {ventasFiltradas.length} resultado{ventasFiltradas.length !== 1 ? "s" : ""}
          </div>
        )}
        {/* Resumen rápido */}
        <div style={{ display: "flex", gap: 16, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.violetaPale}`, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: C.violeta }}>🍦 {ventasFiltradas.length} ventas</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: "#2980b9" }}>💰 Vendido: {fmt(totalFiltrado)}</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: "#e74c3c" }}>📦 Costo: {fmt(costoFiltrado)}</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: "#27ae60" }}>✅ Ganancia: {fmt(totalFiltrado - costoFiltrado)}</span>
        </div>
      </Card>

      {ventasFiltradas.length === 0 ? (
        <Card style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 40 }}>🍦</div>
          <p style={{ color: C.violetaLight, fontWeight: 700 }}>No hay ventas con esos filtros</p>
        </Card>
      ) : (
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: C.violetaPale }}>
                {["#", "Fecha", "Hora", "Sucursal", "Empleada", "Ítems", "Total", "Pago", ""].map((h, i) => (
                  <th key={i} style={{ padding: "12px 14px", textAlign: "left", color: C.violeta, fontWeight: 800, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ventasFiltradas.map((v, i) => (
                <tr key={v.id} style={{ borderTop: `1px solid ${C.violetaPale}`, background: i % 2 === 0 ? C.blanco : C.crema }}>
                  <td style={{ padding: "10px 14px", color: "#bbb", fontWeight: 700 }}>#{String(v.id).slice(-5)}</td>
                  <td style={{ padding: "10px 14px", fontWeight: 600 }}>{fechaLegible(v.fecha)}</td>
                  <td style={{ padding: "10px 14px", color: C.violetaMed }}>{v.hora}</td>
                  <td style={{ padding: "10px 14px" }}>{(data.sucursales.find((s) => s.id === v.sucursal_id) || {}).nombre}</td>
                  <td style={{ padding: "10px 14px", fontWeight: 700 }}>{v.usuario_nombre}</td>
                  <td style={{ padding: "10px 14px", color: "#888" }}>{v.items.length}</td>
                  <td style={{ padding: "10px 14px", fontWeight: 900, color: "#27ae60" }}>{fmt(v.total)}</td>
                  <td style={{ padding: "10px 14px" }}>{v.formaPago === "efectivo" ? "💵" : v.formaPago === "tarjeta" ? "💳" : v.formaPago === "consumo" ? "👤" : v.formaPago === "mixto" ? "🔀" : "📱"}</td>
                  <td style={{ padding: "10px 14px" }}>
                    <button onClick={function() { setVentaEditando(v); setEditForm({ formaPago: v.formaPago, items: v.items.map(function(it){ return {...it}; }) }); }}
                      style={{ padding:"4px 10px", borderRadius:8, border:"2px solid " + C.violeta, background:C.blanco, cursor:"pointer", fontSize:11, fontWeight:700, color:C.violeta, fontFamily:"Nunito, sans-serif", marginRight:4 }}>
                      Editar
                    </button>
                    <button onClick={function() {
                        if (window.confirm("¿Eliminar esta venta? Esta acción no se puede deshacer.")) {
                          eliminarVenta(v.id);
                          setData(function(prev) {
                            return { ...prev, ventas: prev.ventas.filter(function(x){ return x.id !== v.id; }) };
                          });
                        }
                      }}
                      style={{ padding:"4px 10px", borderRadius:8, border:"2px solid #ffb3b3", background:C.blanco, cursor:"pointer", fontSize:11, fontWeight:700, color:"#e74c3c", fontFamily:"Nunito, sans-serif", marginRight:4 }}>
                      Eliminar
                    </button>
                    <button onClick={() => setVentaDetalle(v)}
                      style={{ padding: "4px 10px", borderRadius: 8, border: `2px solid ${C.violetaLight}`, background: C.blanco, cursor: "pointer", fontSize: 11, fontWeight: 700, color: C.violeta, fontFamily: "Nunito, sans-serif" }}>
                      Ver
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {ventaDetalle && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(45,21,89,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}>
          <Card style={{ maxWidth: 440, width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={{ margin: "0 0 16px", color: C.violeta, fontFamily: "Baloo 2, cursive" }}>Detalle venta #{String(ventaDetalle.id).slice(-5)}</h3>
            <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse", marginBottom: 12 }}>
              <thead><tr style={{ background: C.violetaPale }}>
                {["Producto", "Cant", "Precio", "Costo", "Subtotal"].map((h, i) => (
                  <th key={i} style={{ padding: "8px 10px", textAlign: i === 0 ? "left" : "right", color: C.violeta, fontWeight: 800, fontSize: 11, textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {ventaDetalle.items.map((item, i) => (
                  <tr key={i} style={{ borderTop: `1px solid ${C.violetaPale}` }}>
                    <td style={{ padding: "7px 10px", fontWeight: 700 }}>{item.nombre}</td>
                    <td style={{ textAlign: "right", padding: "7px 10px" }}>{item.cantidad}</td>
                    <td style={{ textAlign: "right", padding: "7px 10px", color: "#2980b9" }}>{fmt(item.precio)}</td>
                    <td style={{ textAlign: "right", padding: "7px 10px", color: "#e74c3c" }}>{fmt(item.costo)}</td>
                    <td style={{ textAlign: "right", padding: "7px 10px", fontWeight: 800 }}>{fmt(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ borderTop: `3px solid ${C.violetaPale}`, paddingTop: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 900, fontSize: 16, color: C.violeta }}><span>Total vendido</span><span>{fmt(ventaDetalle.total)}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#e74c3c", fontWeight: 700 }}><span>Costo total</span><span>({fmt(ventaDetalle.costo_total)})</span></div>
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 900, color: "#27ae60", fontSize: 15, marginTop: 4 }}><span>Ganancia</span><span>{fmt(ventaDetalle.total - ventaDetalle.costo_total)}</span></div>
            </div>
            <button onClick={() => setVentaDetalle(null)}
              style={{ width: "100%", marginTop: 16, padding: "11px", borderRadius: 12, border: "none", background: C.violeta, color: C.blanco, fontWeight: 800, cursor: "pointer", fontFamily: "Nunito, sans-serif" }}>
              Cerrar
            </button>
          </Card>
        </div>
      )}

    {/* ── MODAL EDITAR VENTA ── */}
    {ventaEditando && editForm && (
      <div style={{ position:"fixed", inset:0, background:"rgba(45,21,89,0.75)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200, padding:20 }}>
        <Card style={{ maxWidth:520, width:"100%", maxHeight:"92vh", overflowY:"auto" }}>
          <h3 style={{ margin:"0 0 4px", color:C.violeta, fontFamily:"Baloo 2, cursive", fontSize:20 }}>
            Editar venta #{String(ventaEditando.id).slice(-5)}
          </h3>
          <div style={{ fontSize:12, color:"#aaa", marginBottom:18 }}>
            {fechaLegible(ventaEditando.fecha)} {ventaEditando.hora} · {ventaEditando.usuario_nombre}
          </div>

          {/* Selector de productos - igual al POS */}
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:11, color:C.violeta, fontWeight:800, textTransform:"uppercase", letterSpacing:1, marginBottom:8 }}>Agregar producto</div>
            <div style={{ display:"flex", gap:6, marginBottom:8 }}>
              {["productos","promos","pedidoya"].map(function(cat) {
                var labels = {productos:"Productos", promos:"Promos", pedidoya:"Pedido Ya"};
                return (
                  <button key={cat} onClick={function(){setEditCat(cat);}}
                    style={{ flex:1, padding:"6px 4px", borderRadius:8, border:"none", cursor:"pointer", fontSize:11, fontWeight:800, fontFamily:"Nunito, sans-serif",
                      background: editCat===cat ? C.violeta : C.violetaPale,
                      color: editCat===cat ? C.blanco : C.violetaMed }}>
                    {labels[cat]}
                  </button>
                );
              })}
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:6, maxHeight:180, overflowY:"auto" }}>
              {data.productos.filter(function(p){ return p.categoria===editCat && p.activo; }).map(function(p) {
                return (
                  <button key={p.id}
                    onClick={function() {
                      var existe = editForm.items.find(function(it){ return it.id===p.id; });
                      if (existe) {
                        setEditForm({...editForm, items: editForm.items.map(function(it) {
                          if (it.id !== p.id) return it;
                          var nc = it.cantidad + 1;
                          return {...it, cantidad:nc, subtotal:nc*it.precio, costo_total:nc*(it.costo||0)};
                        })});
                      } else {
                        var costo = p.costo || 0;
                        setEditForm({...editForm, items: [...editForm.items, {
                          id: p.id, nombre: p.nombre, emoji: p.emoji,
                          cantidad: 1, precio: p.precio, costo: costo,
                          subtotal: p.precio, costo_total: costo
                        }]});
                      }
                    }}
                    style={{ padding:"8px 4px", borderRadius:10, border:"2px solid " + C.violetaPale,
                      background:C.blanco, cursor:"pointer", textAlign:"center",
                      fontFamily:"Nunito, sans-serif" }}>
                    <div style={{ fontSize:18 }}>{p.emoji}</div>
                    <div style={{ fontSize:10, fontWeight:700, color:C.dark, marginTop:2 }}>{p.nombre}</div>
                    <div style={{ fontSize:10, color:C.violeta, fontWeight:800 }}>{fmt(p.precio)}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:11, color:C.violeta, fontWeight:800, textTransform:"uppercase", letterSpacing:1, marginBottom:8 }}>Productos en la venta</div>
            {editForm.items.map(function(item, idx) {
              return (
                <div key={idx} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 0", borderBottom:"1px solid " + C.violetaPale }}>
                  <div style={{ flex:1, fontSize:13, fontWeight:700, color:C.dark }}>{item.nombre}</div>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <button onClick={function() {
                        var ni = editForm.items.map(function(it,i) {
                          if (i !== idx) return it;
                          var nc = Math.max(1, it.cantidad - 1);
                          return {...it, cantidad:nc, subtotal:nc*it.precio, costo_total:nc*it.costo};
                        });
                        setEditForm({...editForm, items:ni});
                      }}
                      style={{ width:26, height:26, borderRadius:"50%", border:"2px solid " + C.violetaLight, background:C.blanco, cursor:"pointer", fontWeight:900, fontSize:14, color:C.violeta, display:"flex", alignItems:"center", justifyContent:"center" }}>−</button>
                    <span style={{ fontSize:14, fontWeight:900, minWidth:24, textAlign:"center", color:C.violeta }}>{item.cantidad}</span>
                    <button onClick={function() {
                        var ni = editForm.items.map(function(it,i) {
                          if (i !== idx) return it;
                          var nc = it.cantidad + 1;
                          return {...it, cantidad:nc, subtotal:nc*it.precio, costo_total:nc*it.costo};
                        });
                        setEditForm({...editForm, items:ni});
                      }}
                      style={{ width:26, height:26, borderRadius:"50%", border:"none", background:C.violeta, cursor:"pointer", fontWeight:900, fontSize:14, color:C.blanco, display:"flex", alignItems:"center", justifyContent:"center" }}>+</button>
                  </div>
                  <div style={{ fontSize:13, fontWeight:900, color:C.violeta, minWidth:72, textAlign:"right" }}>{fmt(item.cantidad * item.precio)}</div>
                  <button onClick={function() { setEditForm({...editForm, items:editForm.items.filter(function(_,i){return i!==idx;})}); }}
                    style={{ background:"none", border:"none", cursor:"pointer", color:"#e74c3c", fontSize:16, padding:"0 4px" }}>✕</button>
                </div>
              );
            })}
          </div>

          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:11, color:C.violeta, fontWeight:800, textTransform:"uppercase", letterSpacing:1, marginBottom:8 }}>Forma de pago</div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {["efectivo","tarjeta","qr","consumo"].map(function(fp) {
                var labels = {efectivo:"💵 Efectivo", tarjeta:"💳 Tarjeta", qr:"📱 QR", consumo:"👤 Consumo"};
                return (
                  <button key={fp} onClick={function(){setEditForm({...editForm, formaPago:fp});}}
                    style={{ padding:"8px 14px", borderRadius:10, cursor:"pointer", fontSize:13, fontFamily:"Nunito, sans-serif",
                      border: editForm.formaPago===fp ? "2px solid " + C.violeta : "2px solid " + C.violetaLight,
                      background: editForm.formaPago===fp ? C.violetaPale : C.blanco,
                      color: editForm.formaPago===fp ? C.violeta : "#555",
                      fontWeight: editForm.formaPago===fp ? 800 : 600 }}>
                    {labels[fp]}
                  </button>
                );
              })}
            </div>
          </div>

          {editForm.items.length > 0 && (
            <div style={{ background:C.violetaPale, borderRadius:12, padding:"12px 14px", marginBottom:16 }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontWeight:900, fontSize:16, color:C.violeta }}>
                <span>Nuevo total</span>
                <span>{fmt(editForm.items.reduce(function(s,it){return s+it.subtotal;},0))}</span>
              </div>
              {editForm.items.reduce(function(s,it){return s+it.subtotal;},0) !== ventaEditando.total && (
                <div style={{ fontSize:12, color:"#888", marginTop:3 }}>Total original: {fmt(ventaEditando.total)}</div>
              )}
            </div>
          )}

          <div style={{ display:"flex", gap:10 }}>
            <button onClick={function(){setVentaEditando(null); setEditForm(null);}}
              style={{ flex:1, padding:"11px", borderRadius:12, border:"2px solid " + C.violetaLight, background:C.blanco, cursor:"pointer", fontWeight:700, fontFamily:"Nunito, sans-serif" }}>
              Cancelar
            </button>
            <button onClick={function() {
                if (editForm.items.length === 0) return;
                var nuevoTotal = editForm.items.reduce(function(s,it){return s+it.subtotal;},0);
                var nuevoCosto = editForm.items.reduce(function(s,it){return s+(it.costo||0)*it.cantidad;},0);
                actualizarVenta(ventaEditando.id, { items: editForm.items, formaPago: editForm.formaPago, total: nuevoTotal, costo_total: nuevoCosto });
                setData(function(prev) {
                  return { ...prev, ventas: prev.ventas.map(function(v) {
                    if (v.id !== ventaEditando.id) return v;
                    return {...v, items:editForm.items, formaPago:editForm.formaPago, forma_pago:editForm.formaPago, total:nuevoTotal, costo_total:nuevoCosto, editada:true};
                  })};
                });
                setVentaEditando(null); setEditForm(null);
              }}
              style={{ flex:2, padding:"11px", borderRadius:12, border:"none", background:C.violeta, color:C.blanco, fontWeight:800, cursor:"pointer", fontFamily:"Nunito, sans-serif", fontSize:14 }}>
              Guardar cambios
            </button>
          </div>
        </Card>
      </div>
    )}
    </div>
  );
}

// ─── ESTADO DE RESULTADOS ─────────────────────────────────────────────────────
function TabResultados({ data }) {
  const primerDia = data.ventas.length > 0
    ? [...data.ventas].sort((a,b) => a.fecha.localeCompare(b.fecha))[0].fecha
    : hoy();
  const [desde, setDesde] = useState(hoy().slice(0,7) + "-01");
  const [hasta, setHasta] = useState(hoy());
  const [horaDesde, setHoraDesde] = useState("");
  const [horaHasta, setHoraHasta] = useState("");
  const [sucFiltro, setSucFiltro] = useState("");

  const setAtajo = (tipo) => {
    const hoyStr = hoy();
    const mesStr = hoyStr.slice(0,7);
    if (tipo === "hoy") { setDesde(hoyStr); setHasta(hoyStr); }
    else if (tipo === "semana") {
      const lunes = new Date(); lunes.setDate(lunes.getDate() - (lunes.getDay() === 0 ? 6 : lunes.getDay() - 1));
      setDesde(lunes.toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" })); setHasta(hoyStr);
    }
    else if (tipo === "mes") { setDesde(mesStr + "-01"); setHasta(hoyStr); }
    else if (tipo === "todo") { setDesde(primerDia); setHasta(hoyStr); }
  };

  const ventasSuc = data.ventas.filter(v => (!sucFiltro || v.sucursal_id === Number(sucFiltro)));
  const ventasPorFecha = ventasSuc.filter(v => v.fecha >= desde && v.fecha <= hasta);
  const ventasFiltradas = horaDesde || horaHasta
    ? filtrarPorHora(ventasSuc, horaDesde, horaHasta, desde, hasta)
    : ventasPorFecha;
  const ingresos = ventasFiltradas.reduce((s, v) => s + v.total, 0);
  const costos = ventasFiltradas.reduce((s, v) => s + v.costo_total, 0);
  const ganancia = ingresos - costos;
  const margen = ingresos > 0 ? ((ganancia / ingresos) * 100).toFixed(1) : 0;

  const porProducto = {};
  ventasFiltradas.forEach((v) => v.items.forEach((item) => {
    if (!porProducto[item.nombre]) porProducto[item.nombre] = { nombre: item.nombre, cantidad: 0, ingresos: 0, costos: 0 };
    porProducto[item.nombre].cantidad += item.cantidad;
    porProducto[item.nombre].ingresos += item.subtotal;
    porProducto[item.nombre].costos += item.costo_total;
  }));
  const tablaProductos = Object.values(porProducto).sort((a, b) => b.ingresos - a.ingresos);

  const porPago = { efectivo: 0, tarjeta: 0, qr: 0 };
  ventasFiltradas.forEach((v) => { porPago[v.formaPago] = (porPago[v.formaPago] || 0) + v.total; });

  const filtroStyle = { padding: "8px 12px", borderRadius: 10, border: `2px solid ${C.violetaLight}`, fontSize: 13, fontFamily: "Nunito, sans-serif", fontWeight: 600, color: C.dark, outline: "none", background: C.blanco };
  const labelPeriodo = desde === hasta ? fechaLegible(desde) : `${fechaLegible(desde)} al ${fechaLegible(hasta)}`;

  return (
    <div>
      <SectionTitle>Estado de Resultados</SectionTitle>

      {/* Filtros */}
      <Card style={{ marginBottom: 16, padding: "14px 18px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[
              { key: "hoy", label: "Hoy" },
              { key: "semana", label: "Esta semana" },
              { key: "mes", label: "Este mes" },
              { key: "todo", label: "Todo" },
            ].map((a) => (
              <button key={a.key} onClick={() => setAtajo(a.key)}
                style={{ padding: "6px 14px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 800, fontFamily: "Nunito, sans-serif", background: C.violetaPale, color: C.violeta }}>
                {a.label}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 12, color: C.violetaMed, fontWeight: 700 }}>Desde</span>
            <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} style={filtroStyle} />
            <span style={{ fontSize: 12, color: C.violetaMed, fontWeight: 700 }}>Hasta</span>
            <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} style={filtroStyle} />
            <span style={{ fontSize: 12, color: C.violetaMed, fontWeight: 700 }}>Hora desde</span>
            <input type="time" value={horaDesde} onChange={(e) => setHoraDesde(e.target.value)} style={filtroStyle} />
            <span style={{ fontSize: 12, color: C.violetaMed, fontWeight: 700 }}>Hora hasta</span>
            <input type="time" value={horaHasta} onChange={(e) => setHoraHasta(e.target.value)} style={filtroStyle} />
          </div>
          <select value={sucFiltro} onChange={(e) => setSucFiltro(e.target.value)} style={filtroStyle}>
            <option value="">Ambas sucursales</option>
            {data.sucursales.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        {/* Estado de resultados */}
        <Card>
          <h4 style={{ margin: "0 0 16px", color: C.violeta, fontFamily: "Baloo 2, cursive", fontSize: 17 }}>
            Resultados — {labelPeriodo}
          </h4>
          {[
            { label: "Ventas brutas", value: fmt(ingresos), color: "#2980b9" },
            { label: "(−) Costo de ventas", value: `(${fmt(costos)})`, color: "#e74c3c" },
          ].map((row, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${C.violetaPale}`, fontSize: 14 }}>
              <span style={{ color: "#555", fontWeight: 600 }}>{row.label}</span>
              <span style={{ fontWeight: 800, color: row.color }}>{row.value}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 0", fontSize: 18, fontWeight: 900 }}>
            <span style={{ color: C.violeta }}>Resultado bruto</span>
            <span style={{ color: ganancia >= 0 ? "#27ae60" : "#e74c3c" }}>{fmt(ganancia)}</span>
          </div>
          <div style={{ background: ganancia >= 0 ? C.mentaPale : "#ffe8e8", borderRadius: 12, padding: "12px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 13, color: "#777", fontWeight: 600, marginBottom: 2 }}>Margen de ganancia</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: ganancia >= 0 ? "#27ae60" : "#e74c3c", fontFamily: "Baloo 2, cursive" }}>{margen}%</div>
          </div>
        </Card>

        {/* Forma de pago */}
        <Card>
          <h4 style={{ margin: "0 0 16px", color: C.violeta, fontFamily: "Baloo 2, cursive", fontSize: 17 }}>Por forma de pago</h4>
          {[
            { key: "efectivo", label: "💵 Efectivo", color: "#27ae60" },
            { key: "tarjeta", label: "💳 Tarjeta / Débito", color: "#2980b9" },
            { key: "qr", label: "📱 QR / Transferencia", color: C.violeta },
            { key: "consumo", label: "👤 Consumo empleado", color: "#7d3c98" },
            { key: "mixto", label: "🔀 Pago mixto", color: "#e67e22" },
          ].map((fp) => {
            const total2 = porPago[fp.key] || 0;
            const pct = ingresos > 0 ? (total2 / ingresos) * 100 : 0;
            return (
              <div key={fp.key} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 5 }}>
                  <span style={{ fontWeight: 700 }}>{fp.label}</span>
                  <span style={{ fontWeight: 900, color: fp.color }}>{fmt(total2)}</span>
                </div>
                <div style={{ background: C.violetaPale, borderRadius: 6, height: 8 }}>
                  <div style={{ width: `${pct}%`, background: fp.color, borderRadius: 6, height: "100%", transition: "width 0.5s" }} />
                </div>
                <div style={{ fontSize: 11, color: "#aaa", fontWeight: 600, marginTop: 2 }}>{pct.toFixed(0)}% del total</div>
              </div>
            );
          })}
          {/* Subtotales */}
          <div style={{ borderTop:"2px solid " + C.violetaLight, marginTop:8, paddingTop:12, display:"flex", flexDirection:"column", gap:6 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 12px", background:"#e8f5e8", borderRadius:10 }}>
              <span style={{ fontWeight:800, fontSize:14, color:"#27ae60" }}>💵 Subtotal Efectivo</span>
              <span style={{ fontWeight:900, fontSize:16, color:"#27ae60" }}>{fmt(porPago.efectivo || 0)}</span>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 12px", background:C.violetaPale, borderRadius:10 }}>
              <span style={{ fontWeight:800, fontSize:14, color:C.violeta }}>💳📱👤🔀 Subtotal No efectivo</span>
              <span style={{ fontWeight:900, fontSize:16, color:C.violeta }}>{fmt((porPago.tarjeta||0) + (porPago.qr||0) + (porPago.consumo||0) + (porPago.mixto||0))}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Desglose por producto */}
      {tablaProductos.length > 0 && (
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", background: C.violetaPale }}>
            <h4 style={{ margin: 0, color: C.violeta, fontFamily: "Baloo 2, cursive" }}>Desglose por producto</h4>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 500 }}>
            <thead>
              <tr style={{ background: C.crema }}>
                {["Producto", "Cant. vendida", "Ingresos", "Costos", "Ganancia", "Margen"].map((h, i) => (
                  <th key={i} style={{ padding: "10px 14px", textAlign: i === 0 ? "left" : "right", color: C.violeta, fontWeight: 800, fontSize: 11, textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tablaProductos.map((p, i) => {
                const gan = p.ingresos - p.costos;
                const marg = p.ingresos > 0 ? ((gan / p.ingresos) * 100).toFixed(0) : 0;
                return (
                  <tr key={i} style={{ borderTop: `1px solid ${C.violetaPale}`, background: i % 2 === 0 ? C.blanco : C.crema }}>
                    <td style={{ padding: "10px 14px", fontWeight: 800, color: C.dark }}>{p.nombre}</td>
                    <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 700 }}>{p.cantidad}</td>
                    <td style={{ padding: "10px 14px", textAlign: "right", color: "#2980b9", fontWeight: 800 }}>{fmt(p.ingresos)}</td>
                    <td style={{ padding: "10px 14px", textAlign: "right", color: "#e74c3c", fontWeight: 700 }}>{fmt(p.costos)}</td>
                    <td style={{ padding: "10px 14px", textAlign: "right", color: "#27ae60", fontWeight: 900 }}>{fmt(gan)}</td>
                    <td style={{ padding: "10px 14px", textAlign: "right" }}>
                      <span style={{
                        background: Number(marg) >= 50 ? C.mentaPale : C.amarilloLight,
                        color: Number(marg) >= 50 ? "#2a7a5e" : "#8a6500",
                        padding: "3px 10px", borderRadius: 10, fontWeight: 800, fontSize: 12,
                      }}>{marg}%</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}


// ─── TAB CAJA (ADMIN) ─────────────────────────────────────────────────────────
function TabCaja({ data }) {
  const [filtroFecha, setFiltroFecha] = useState(hoy());
  const [horaDesde, setHoraDesde] = useState("");
  const [horaHasta, setHoraHasta] = useState("");
  const [filtroSuc, setFiltroSuc] = useState("");
  const [cajaSeleccionada, setCajaSeleccionada] = useState(null);

  const cajasFiltradas = data.cajas.filter(c => {
    if (filtroFecha && c.fecha !== filtroFecha) return false;
    if (filtroSuc && c.sucursalId !== Number(filtroSuc)) return false;
    if (horaDesde && c.horaApertura < horaDesde) return false;
    if (horaHasta && c.horaApertura > horaHasta) return false;
    return true;
  }).sort((a,b) => b.id - a.id);

  const filtroStyle = { padding:"8px 12px", borderRadius:10, border:`2px solid ${C.violetaLight}`, fontSize:13, fontFamily:"Nunito, sans-serif", fontWeight:600, color:C.dark, outline:"none", background:C.blanco };

  const ResumenCaja = ({ caja }) => {
    const ventasCaja  = (data.ventas || []).filter(function(v) { return v.cajaId === caja.id; });
    const efectivo    = ventasCaja.filter(function(v){return v.formaPago==="efectivo";}).reduce(function(s,v){return s+v.total;},0);
    const tarjeta     = ventasCaja.filter(function(v){return v.formaPago==="tarjeta";}).reduce(function(s,v){return s+v.total;},0);
    const qr          = ventasCaja.filter(function(v){return v.formaPago==="qr";}).reduce(function(s,v){return s+v.total;},0);
    const consumoAdm  = ventasCaja.filter(function(v){return v.formaPago==="consumo";}).reduce(function(s,v){return s+v.total;},0);
    const total       = ventasCaja.reduce(function(s,v){return s+v.total;},0);
    const retirosAdm  = (data.retiros || []).filter(function(r){return r.cajaId===caja.id;});
    const totalRetirosAdm = retirosAdm.reduce(function(s,r){return s+r.monto;},0);
    const efectivoFisico  = efectivo - totalRetirosAdm + (caja.montoInicial || 0);

    return (
      <div style={{ position:"fixed", inset:0, background:"rgba(45,21,89,0.75)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100, padding:20 }}>
        <Card style={{ maxWidth:500, width:"100%", maxHeight:"90vh", overflowY:"auto" }}>
          {/* Header */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:18 }}>
            <div>
              <h3 style={{ margin:"0 0 4px", color:C.violeta, fontFamily:"Baloo 2, cursive", fontSize:20 }}>Detalle de caja</h3>
              <div style={{ fontSize:13, color:"#888" }}>{caja.sucursalNombre} · {fechaLegible(caja.fecha)}</div>
            </div>
            <span style={{ background: caja.cerrada ? C.mentaPale : C.amarilloLight, color: caja.cerrada ? "#2a7a5e" : "#8a6500", padding:"4px 12px", borderRadius:10, fontSize:12, fontWeight:800 }}>
              {caja.cerrada ? "✅ Cerrada" : "🟡 Abierta"}
            </span>
          </div>

          {/* Info turno */}
          <div style={{ background:C.violetaPale, borderRadius:12, padding:"12px 16px", marginBottom:16 }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, fontSize:13 }}>
              <div><span style={{ color:"#888" }}>Empleada: </span><strong>{caja.usuarioNombre}</strong></div>
              <div><span style={{ color:"#888" }}>Apertura: </span><strong>{caja.horaApertura}</strong></div>
              {caja.horaCierre && <div><span style={{ color:"#888" }}>Cierre: </span><strong>{caja.horaCierre}</strong></div>}
              {caja.montoInicial > 0 && <div><span style={{ color:"#888" }}>Fondo inicial: </span><strong>{fmt(caja.montoInicial)}</strong></div>}
            </div>
          </div>

          {/* Medios de pago */}
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:11, color:C.violetaMed, fontWeight:800, textTransform:"uppercase", letterSpacing:1, marginBottom:10 }}>
              Recaudación por medio de pago
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {[
                { label:"💵 Efectivo (ventas)", value:efectivo, bg:"#e8f5e8", color:"#27ae60" },
                { label:"💳 Tarjeta / Debito", value:tarjeta, bg:"#e8f0fe", color:"#2d5fa8" },
                { label:"📱 QR / Transferencia", value:qr, bg:C.violetaPale, color:C.violeta },
                { label:"👤 Consumo empleado", value:consumoAdm, bg:"#f3e5f5", color:"#7d3c98" },
              ].map(function(row,i) { return (
                <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 14px", background:row.bg, borderRadius:12 }}>
                  <span style={{ fontWeight:700, fontSize:13 }}>{row.label}</span>
                  <span style={{ fontWeight:900, fontSize:16, color:row.color }}>{fmt(row.value)}</span>
                </div>
              ); })}
              {retirosAdm.length > 0 && (
                <div style={{ background:"#ffe8e8", borderRadius:12, padding:"10px 14px", marginTop:6 }}>
                  <div style={{ fontWeight:800, color:"#e74c3c", fontSize:13, marginBottom:6 }}>💸 Retiros de caja</div>
                  {retirosAdm.map(function(r) {
                    return (
                      <div key={r.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:12, padding:"4px 0", borderBottom:"1px solid #ffcdd2" }}>
                        <span style={{ color:"#555" }}>{r.hora} · {r.motivo}</span>
                        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                          <span style={{ fontWeight:800, color:"#e74c3c" }}>{fmt(r.monto)}</span>
                          <button onClick={function() {
                              var nuevoMotivo = window.prompt("Motivo:", r.motivo);
                              if (nuevoMotivo === null) return;
                              var nuevoMonto = window.prompt("Monto:", r.monto);
                              if (nuevoMonto === null) return;
                              actualizarRetiro(r.id, { motivo: nuevoMotivo, monto: Number(nuevoMonto) });
                              setData(function(prev) { return { ...prev, retiros: prev.retiros.map(function(x) { return x.id===r.id ? {...x, motivo:nuevoMotivo, monto:Number(nuevoMonto)} : x; }) }; });
                            }}
                            style={{ padding:"2px 6px", borderRadius:6, border:"2px solid " + C.violetaLight, background:"white", cursor:"pointer", fontSize:10, fontWeight:700, color:C.violeta }}>
                            ✏️
                          </button>
                          <button onClick={function() {
                              if (window.confirm("¿Eliminar este retiro?")) {
                                eliminarRetiro(r.id);
                                setData(function(prev) { return { ...prev, retiros: prev.retiros.filter(function(x){ return x.id !== r.id; }) }; });
                              }
                            }}
                            style={{ padding:"2px 6px", borderRadius:6, border:"2px solid #ffb3b3", background:"white", cursor:"pointer", fontSize:10, fontWeight:700, color:"#e74c3c" }}>
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  <div style={{ display:"flex", justifyContent:"space-between", fontWeight:900, color:"#e74c3c", fontSize:13, marginTop:6 }}>
                    <span>Total retirado</span><span>{fmt(totalRetirosAdm)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Total efectivo fisico */}
          <div style={{ background:C.violeta, borderRadius:14, padding:"14px 18px", marginBottom:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ color:"rgba(255,255,255,0.7)", fontSize:11, fontWeight:700, marginBottom:2 }}>💵 EFECTIVO FÍSICO ESTIMADO</div>
                <div style={{ color:"rgba(255,255,255,0.6)", fontSize:11 }}>
                  Ventas {fmt(efectivo)}{totalRetirosRes > 0 ? " - retiros " + fmt(totalRetirosRes) : ""}{caja.montoInicial > 0 ? " + fondo " + fmt(caja.montoInicial) : ""}
                </div>
              </div>
              <div style={{ fontSize:24, fontWeight:900, color:C.amarillo, fontFamily:"Baloo 2, cursive" }}>{fmt(efectivoFisicoRes)}</div>
            </div>
          </div>

          <div style={{ borderTop:`2px solid ${C.violetaPale}`, paddingTop:12, marginBottom:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", fontWeight:900, fontSize:18, color:C.violeta }}>
              <span>TOTAL RECAUDADO</span><span>{fmt(total)}</span>
            </div>
            <div style={{ color:"#aaa", fontSize:12, marginTop:4 }}>{ventasCaja.length} venta{ventasCaja.length !== 1 ? "s" : ""} en el turno</div>
          </div>

          {/* Detalle de ventas */}
          {ventasCaja.length > 0 && (
            <div>
              <div style={{ fontSize:11, color:C.violetaMed, fontWeight:800, textTransform:"uppercase", letterSpacing:1, marginBottom:8 }}>Ventas del turno</div>
              <div style={{ maxHeight:200, overflowY:"auto" }}>
                <table style={{ width:"100%", fontSize:12, borderCollapse:"collapse" }}>
                  <thead>
                    <tr style={{ background:C.violetaPale }}>
                      {["Hora","Productos","Pago","Total"].map((h,i) => (
                        <th key={i} style={{ padding:"6px 10px", textAlign: i===3?"right":"left", color:C.violeta, fontWeight:800, fontSize:11 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ventasCaja.map((v,i) => (
                      <tr key={i} style={{ borderTop:`1px solid ${C.violetaPale}` }}>
                        <td style={{ padding:"6px 10px", color:"#888" }}>{v.hora}</td>
                        <td style={{ padding:"6px 10px" }}>{v.items.map(it=>it.nombre).join(", ").slice(0,30)}{v.items.map(it=>it.nombre).join(", ").length > 30 ? "…" : ""}</td>
                        <td style={{ padding:"6px 10px" }}>{v.formaPago === "efectivo" ? "💵" : v.formaPago === "tarjeta" ? "💳" : v.formaPago === "consumo" ? "👤" : v.formaPago === "mixto" ? "🔀" : "📱"}</td>
                        <td style={{ padding:"6px 10px", textAlign:"right", fontWeight:800, color:"#27ae60" }}>{fmt(v.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <button onClick={() => setCajaSeleccionada(null)} style={{ width:"100%", marginTop:18, padding:"11px", borderRadius:12, border:"none", background:C.violeta, color:C.blanco, fontWeight:800, cursor:"pointer", fontFamily:"Nunito, sans-serif" }}>
            Cerrar
          </button>
        </Card>
      </div>
    );
  };

  return (
    <div>
      <SectionTitle>Caja</SectionTitle>

      {/* Filtros */}
      <Card style={{ marginBottom:16, padding:"14px 18px" }}>
        <div style={{ display:"flex", flexWrap:"wrap", gap:8, alignItems:"center" }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
            <span style={{ fontSize:11, color:C.violetaMed, fontWeight:700 }}>📅 Fecha</span>
            <input type="date" value={filtroFecha} onChange={(e) => setFiltroFecha(e.target.value)} style={filtroStyle} />
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
            <span style={{ fontSize:11, color:C.violetaMed, fontWeight:700 }}>🕐 Apertura</span>
            <input type="time" value={horaDesde} onChange={e => setHoraDesde(e.target.value)} style={{ padding:"8px 12px", borderRadius:10, border:"2px solid " + C.violetaLight, fontSize:12, fontWeight:600, color:C.dark, outline:"none", background:C.blanco, width:100 }} />
            <span style={{ fontSize:11, color:C.violetaMed, fontWeight:700 }}>a</span>
            <input type="time" value={horaHasta} onChange={e => setHoraHasta(e.target.value)} style={{ padding:"8px 12px", borderRadius:10, border:"2px solid " + C.violetaLight, fontSize:12, fontWeight:600, color:C.dark, outline:"none", background:C.blanco, width:100 }} />
            {(horaDesde || horaHasta) && (
              <button onClick={() => {setHoraDesde(""); setHoraHasta("");}}
                style={{ padding:"5px 8px", borderRadius:8, border:"none", background:"#ffe8e8", color:"#c0392b", cursor:"pointer", fontSize:11, fontWeight:800 }}>✕</button>
            )}
          </div>
          <select value={filtroSuc} onChange={(e) => setFiltroSuc(e.target.value)} style={filtroStyle}>
            <option value="">Ambas sucursales</option>
            {data.sucursales.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
          <button onClick={() => { setFiltroFecha(hoy()); setFiltroSuc(""); setHoraDesde(""); setHoraHasta(""); }}
            style={{ padding:"8px 14px", borderRadius:10, border:`2px solid ${C.violetaLight}`, background:C.blanco, cursor:"pointer", fontSize:12, fontWeight:700, color:C.violeta, fontFamily:"Nunito, sans-serif" }}>
            Hoy
          </button>
        </div>
      </Card>

      {/* Lista de cajas */}
      {cajasFiltradas.length === 0 ? (
        <Card style={{ textAlign:"center", padding:40 }}>
          <div style={{ fontSize:40 }}>🏪</div>
          <p style={{ color:C.violetaLight, fontWeight:700 }}>No hay cajas registradas para ese filtro</p>
        </Card>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {cajasFiltradas.map((caja) => {
            const ventasCaja = (data.ventas || []).filter(function(v){return v.cajaId===caja.id;});
            const efectivo = ventasCaja.filter(function(v){return v.formaPago==="efectivo";}).reduce(function(s,v){return s+v.total;},0);
            const otros = ventasCaja.filter(function(v){return v.formaPago!=="efectivo"&&v.formaPago!=="consumo";}).reduce(function(s,v){return s+v.total;},0);
            const consumoCard = ventasCaja.filter(function(v){return v.formaPago==="consumo";}).reduce(function(s,v){return s+v.total;},0);
            const total = ventasCaja.reduce(function(s,v){return s+v.total;},0);
            const retirosCard = (data.retiros||[]).filter(function(r){return r.cajaId===caja.id;});
            const totalRetirosCard = retirosCard.reduce(function(s,r){return s+r.monto;},0);
            const efFisico = efectivo - totalRetirosCard + (caja.montoInicial||0);
            return (
              <Card key={caja.id} style={{ cursor:"pointer", transition:"box-shadow 0.2s", borderLeft:`4px solid ${caja.cerrada ? C.menta : C.amarillo}` }}
                onClick={() => setCajaSeleccionada(caja)}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
                  <div>
                    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
                      <span style={{ fontWeight:900, fontSize:15, color:C.violeta }}>{caja.usuarioNombre}</span>
                      <span style={{ background: caja.cerrada ? C.mentaPale : C.amarilloLight, color: caja.cerrada ? "#2a7a5e" : "#8a6500", padding:"2px 10px", borderRadius:10, fontSize:11, fontWeight:800 }}>
                        {caja.cerrada ? "✅ Cerrada" : "🟡 Abierta"}
                      </span>
                    </div>
                    <div style={{ fontSize:12, color:"#888" }}>
                      {caja.sucursalNombre} · {fechaLegible(caja.fecha)}
                    </div>
                    <div style={{ fontSize:12, color:"#888", marginTop:2 }}>
                      Apertura: {caja.horaApertura}
                      {caja.horaCierre ? " · Cierre: " + caja.horaCierre : " · En curso"}
                      {" · "}{ventasCaja.length} ventas
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:16, alignItems:"center" }}>
                    <div style={{ textAlign:"center" }}>
                      <div style={{ fontSize:11, color:"#888", fontWeight:600 }}>💵 Ef.fisico</div>
                      <div style={{ fontSize:15, fontWeight:900, color:"#27ae60" }}>{fmt(efFisico)}</div>
                    </div>
                    <div style={{ textAlign:"center" }}>
                      <div style={{ fontSize:11, color:"#888", fontWeight:600 }}>💳📱 Otros</div>
                      <div style={{ fontSize:15, fontWeight:900, color:"#2980b9" }}>{fmt(otros)}</div>
                    </div>
                    {consumoCard > 0 && (
                      <div style={{ textAlign:"center" }}>
                        <div style={{ fontSize:11, color:"#888", fontWeight:600 }}>👤 Consumo</div>
                        <div style={{ fontSize:14, fontWeight:900, color:"#7d3c98" }}>{fmt(consumoCard)}</div>
                      </div>
                    )}
                    {totalRetirosCard > 0 && (
                      <div style={{ textAlign:"center" }}>
                        <div style={{ fontSize:11, color:"#888", fontWeight:600 }}>💸 Retiros</div>
                        <div style={{ fontSize:14, fontWeight:900, color:"#e74c3c" }}>({fmt(totalRetirosCard)})</div>
                      </div>
                    )}
                    <div style={{ textAlign:"center" }}>
                      <div style={{ fontSize:11, color:"#888", fontWeight:600 }}>TOTAL</div>
                      <div style={{ fontSize:18, fontWeight:900, color:C.violeta }}>{fmt(total)}</div>
                    </div>
                    <div style={{ fontSize:20, color:C.violetaLight }}>›</div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {cajaSeleccionada && <ResumenCaja caja={data.cajas.find(c => c.id === cajaSeleccionada.id) || cajaSeleccionada} />}
    </div>
  );
}

// ─── TAB INSUMOS ─────────────────────────────────────────────────────────────
function TabInsumos({ data, setData }) {
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ nombre: "", costo: "" });

  const abrirForm = (ins = null) => {
    setEditando(ins ? ins.id : "nuevo");
    setForm(ins ? { nombre: ins.nombre, costo: ins.costo } : { nombre: "", costo: "" });
  };

  const guardar = () => {
    if (!form.nombre || !form.costo) return;
    var insData = { nombre: form.nombre, costo: Number(form.costo) };
    if (editando === "nuevo") {
      guardarInsumo(insData).then(function(nuevo) {
        setData(function(prev) { return { ...prev, insumos: [...prev.insumos, { id: nuevo ? nuevo.id : Date.now(), ...insData }] }; });
      });
    } else {
      guardarInsumo({ ...insData, id: editando });
      setData(function(prev) { return { ...prev, insumos: prev.insumos.map(function(i) { return i.id === editando ? { ...i, ...insData } : i; }) }; });
    }
    setEditando(null);
  };

  const eliminar = (id) => {
    const usado = data.productos.some(p => p.receta && p.receta.some(r => r.insumoId === id));
    if (usado) { alert("Este insumo está siendo usado en la receta de uno o más productos. Quitalo de las recetas antes de eliminarlo."); return; }
    if (window.confirm("¿Eliminar este insumo?")) {
      eliminarInsumo(id);
      setData(function(prev) { return { ...prev, insumos: prev.insumos.filter(function(i) { return i.id !== id; }) }; });
    }
  };

  const inputStyle = { width: "100%", padding: "10px 14px", borderRadius: 12, border: `2px solid ${C.violetaLight}`, fontSize: 14, fontFamily: "Nunito, sans-serif", fontWeight: 600, boxSizing: "border-box", outline: "none" };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h4 style={{ margin: 0, color: C.violeta, fontFamily: "Baloo 2, cursive", fontSize: 18 }}>Insumos</h4>
        <button onClick={() => abrirForm()} style={{ padding: "8px 16px", borderRadius: 12, border: "none", background: C.violeta, color: C.blanco, fontWeight: 800, cursor: "pointer", fontSize: 13, fontFamily: "Nunito, sans-serif" }}>
          + Nuevo insumo
        </button>
      </div>

      <Card style={{ padding: 0, overflow: "hidden", marginBottom: 8 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 400 }}>
          <thead>
            <tr style={{ background: C.violetaPale }}>
              {["Nombre del insumo", "Costo unitario", "Usado en", ""].map((h, i) => (
                <th key={i} style={{ padding: "10px 14px", textAlign: i > 0 ? "right" : "left", color: C.violeta, fontWeight: 800, fontSize: 11, textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.insumos.map((ins, i) => {
              const usadoEn = data.productos.filter(p => p.receta && p.receta.some(r => r.insumoId === ins.id));
              return (
                <tr key={ins.id} style={{ borderTop: `1px solid ${C.violetaPale}`, background: i % 2 === 0 ? C.blanco : C.crema }}>
                  <td style={{ padding: "10px 14px", fontWeight: 700 }}>{ins.nombre}</td>
                  <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 900, color: "#e74c3c" }}>{fmt(ins.costo)}</td>
                  <td style={{ padding: "10px 14px", textAlign: "right", fontSize: 12, color: "#888" }}>
                    {usadoEn.length > 0 ? <span style={{ color: C.violeta, fontWeight: 700 }}>{usadoEn.length} producto{usadoEn.length > 1 ? "s" : ""}</span> : "—"}
                  </td>
                  <td style={{ padding: "10px 14px", textAlign: "right" }}>
                    <button onClick={() => abrirForm(ins)} style={{ padding: "4px 10px", borderRadius: 8, border: `2px solid ${C.violetaLight}`, background: C.blanco, cursor: "pointer", fontSize: 11, fontWeight: 700, color: C.violeta, fontFamily: "Nunito, sans-serif", marginRight: 4 }}>Editar</button>
                    <button onClick={() => eliminar(ins.id)} style={{ padding: "4px 10px", borderRadius: 8, border: "2px solid #ffb3b3", background: C.blanco, color: "#e74c3c", cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: "Nunito, sans-serif" }}>Eliminar</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
      <p style={{ fontSize: 12, color: "#aaa", margin: "6px 0 0 4px" }}>💡 Al modificar el costo de un insumo, el costo de todos los productos que lo usan se actualiza automáticamente.</p>

      {editando && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(45,21,89,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}>
          <Card style={{ maxWidth: 340, width: "100%" }}>
            <h3 style={{ margin: "0 0 18px", color: C.violeta, fontFamily: "Baloo 2, cursive" }}>{editando === "nuevo" ? "Nuevo insumo" : "Editar insumo"}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: C.violeta, fontWeight: 800, display: "block", marginBottom: 5, textTransform: "uppercase" }}>Nombre</label>
                <input type="text" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} style={inputStyle} placeholder="Ej: Pote de telgopor" />
              </div>
              <div>
                <label style={{ fontSize: 12, color: C.violeta, fontWeight: 800, display: "block", marginBottom: 5, textTransform: "uppercase" }}>Costo unitario ($)</label>
                <input type="number" value={form.costo} onChange={e => setForm(f => ({ ...f, costo: e.target.value }))} style={inputStyle} placeholder="0" />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button onClick={() => setEditando(null)} style={{ flex: 1, padding: "10px", borderRadius: 12, border: `2px solid ${C.violetaLight}`, background: C.blanco, cursor: "pointer", fontWeight: 700, fontFamily: "Nunito, sans-serif" }}>Cancelar</button>
              <button onClick={guardar} style={{ flex: 2, padding: "10px", borderRadius: 12, border: "none", background: C.violeta, color: C.blanco, fontWeight: 800, cursor: "pointer", fontFamily: "Nunito, sans-serif" }}>Guardar</button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}


// ─── TAB CONSUMOS EMPLEADO (ADMIN) ───────────────────────────────────────────
function TabConsumos({ data, setData }) {
  var hoyStr = hoy();
  var mesStr = hoyStr.slice(0,7);
  const [desde, setDesde] = useState(mesStr + "-01");
  const [hasta, setHasta] = useState(hoyStr);
  const [empleadoFiltro, setEmpleadoFiltro] = useState("");
  const [detalleId, setDetalleId] = useState(null);
  const [consumoEditando, setConsumoEditando] = useState(null);
  const [editConsumoNombre, setEditConsumoNombre] = useState("");
  const [editConsumoUserId, setEditConsumoUserId] = useState(null);
  const [editModo, setEditModo] = useState("lista");
  const [busquedaNombre, setBusquedaNombre] = useState("");

  var empleados = data.usuarios.filter(function(u) { return u.rol === "empleada"; });

  var consumosFiltrados = data.consumosEmpleado.filter(function(c) {
    if (c.fecha < desde || c.fecha > hasta) return false;
    if (empleadoFiltro) {
      var nombre = (c.usuarioNombre || c.usuario_nombre || "").toLowerCase();
      var filtroNum = Number(empleadoFiltro);
      var matchId = !isNaN(filtroNum) && c.usuarioId === filtroNum;
      var matchNombre = nombre.includes(empleadoFiltro.toLowerCase());
      if (!matchId && !matchNombre) return false;
    }
    if (busquedaNombre && !(c.usuarioNombre || c.usuario_nombre || "").toLowerCase().includes(busquedaNombre.toLowerCase())) return false;
    return true;
  }).sort(function(a,b) { return b.id - a.id; });

  var totalFiltrado = consumosFiltrados.reduce(function(s,c) { return s + c.total; }, 0);

  var filtroStyle = { padding:"8px 12px", borderRadius:10, border:"2px solid " + C.violetaLight, fontSize:13, fontFamily:"Nunito, sans-serif", fontWeight:600, color:C.dark, outline:"none", background:C.blanco };

  // Agrupar por empleado para resumen
  var resumenPorEmpleado = empleados.map(function(u) {
    var cs = consumosFiltrados.filter(function(c) { return c.usuarioId === u.id; });
    return { nombre: u.nombre, cantidad: cs.length, total: cs.reduce(function(s,c){return s+c.total;},0) };
  }).filter(function(e) { return e.cantidad > 0; });

  return (
    <div>
      <SectionTitle>Consumos de Empleados</SectionTitle>

      <Card style={{ marginBottom:16, padding:"14px 18px" }}>
        <div style={{ display:"flex", flexWrap:"wrap", gap:8, alignItems:"center" }}>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ fontSize:11, color:C.violetaMed, fontWeight:700 }}>Desde</span>
            <input type="date" value={desde} onChange={function(e){setDesde(e.target.value);}} style={filtroStyle} />
            <span style={{ fontSize:11, color:C.violetaMed, fontWeight:700 }}>Hasta</span>
            <input type="date" value={hasta} onChange={function(e){setHasta(e.target.value);}} style={filtroStyle} />
          </div>
          <select value={empleadoFiltro} onChange={function(e){setEmpleadoFiltro(e.target.value);}} style={filtroStyle}>
            <option value="">Todas las empleadas</option>
            {empleados.map(function(u) {
              return <option key={u.id} value={u.id}>{u.nombre}</option>;
            })}
          </select>
          <input
            type="text"
            placeholder="🔍 Buscar por nombre..."
            value={busquedaNombre}
            onChange={function(e){ setBusquedaNombre(e.target.value); }}
            style={{ ...filtroStyle, minWidth:180 }}
          />
          {busquedaNombre && (
            <button onClick={function(){ setBusquedaNombre(""); }}
              style={{ padding:"6px 12px", borderRadius:10, border:"2px solid " + C.violetaLight, background:C.blanco, cursor:"pointer", fontWeight:700, color:C.violeta, fontSize:12 }}>
              ✕ Limpiar
            </button>
          )}
        </div>
      </Card>

      {resumenPorEmpleado.length > 0 && (
        <div style={{ display:"flex", gap:12, marginBottom:16, flexWrap:"wrap" }}>
          {resumenPorEmpleado.map(function(e) {
            return (
              <Card key={e.nombre} style={{ flex:1, minWidth:160, borderLeft:"4px solid #7d3c98", padding:"12px 16px" }}>
                <div style={{ fontSize:11, color:"#aaa", fontWeight:700, marginBottom:4 }}>👤 {e.nombre}</div>
                <div style={{ fontSize:20, fontWeight:900, color:"#7d3c98" }}>{fmt(e.total)}</div>
                <div style={{ fontSize:12, color:"#aaa" }}>{e.cantidad} consumo{e.cantidad !== 1 ? "s" : ""}</div>
              </Card>
            );
          })}
          <Card style={{ flex:1, minWidth:160, borderLeft:"4px solid " + C.violeta, padding:"12px 16px" }}>
            <div style={{ fontSize:11, color:"#aaa", fontWeight:700, marginBottom:4 }}>TOTAL PERÍODO</div>
            <div style={{ fontSize:20, fontWeight:900, color:C.violeta }}>{fmt(totalFiltrado)}</div>
            <div style={{ fontSize:12, color:"#aaa" }}>{consumosFiltrados.length} consumos</div>
          </Card>
        </div>
      )}

      {consumosFiltrados.length === 0 ? (
        <Card style={{ textAlign:"center", padding:40 }}>
          <div style={{ fontSize:40 }}>👤</div>
          <p style={{ color:C.violetaLight, fontWeight:700 }}>No hay consumos en ese período</p>
        </Card>
      ) : (
        <Card style={{ padding:0, overflow:"hidden" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
            <thead>
              <tr style={{ background:C.violetaPale }}>
                {["Fecha", "Hora", "Empleada", "Sucursal", "Productos", "Total", "Acciones"].map(function(h,i) {
                  return <th key={i} style={{ padding:"10px 14px", textAlign: i > 3 ? "right" : "left", color:C.violeta, fontWeight:800, fontSize:11, textTransform:"uppercase" }}>{h}</th>;
                })}
              </tr>
            </thead>
            <tbody>
              {consumosFiltrados.map(function(c, idx) {
                var nombres = c.items.map(function(it){return it.nombre;}).join(", ");
                var resumen = nombres.length > 30 ? nombres.slice(0,30) + "…" : nombres;
                var abierto = detalleId === c.id;
                return [
                  <tr key={c.id} style={{ borderTop:"1px solid " + C.violetaPale, background: idx % 2 === 0 ? C.blanco : C.crema, cursor:"pointer" }}
                    onClick={function(){setDetalleId(abierto ? null : c.id);}}>
                    <td style={{ padding:"9px 14px" }}>{fechaLegible(c.fecha)}</td>
                    <td style={{ padding:"9px 14px", color:C.violetaMed }}>{c.hora}</td>
                    <td style={{ padding:"9px 14px", fontWeight:700 }}>{c.usuarioNombre}</td>
                    <td style={{ padding:"9px 14px", color:"#888" }}>{c.sucursalNombre}</td>
                    <td style={{ padding:"9px 14px", textAlign:"right", color:"#555" }}>{resumen}</td>
                    <td style={{ padding:"9px 14px", textAlign:"right", fontWeight:900, color:"#7d3c98" }}>{fmt(c.total)}</td>
                    <td style={{ padding:"9px 14px", textAlign:"right" }}>
                      <button onClick={function(e){
                        e.stopPropagation();
                        setConsumoEditando(c);
                        setEditConsumoNombre(c.usuarioNombre || c.usuario_nombre || "");
                        setEditConsumoUserId(c.usuarioId || null);
                        setEditModo(c.usuarioId ? "lista" : "manual");
                      }} style={{ padding:"3px 10px", borderRadius:8, border:"2px solid " + C.violetaLight, background:"white", cursor:"pointer", fontSize:11, fontWeight:700, color:C.violeta, fontFamily:"Nunito, sans-serif", marginRight:4 }}>
                        Editar
                      </button>
                      <button onClick={function(e){
                        e.stopPropagation();
                        if (window.confirm("¿Eliminar este consumo? Esta acción no se puede deshacer.")) {
                          eliminarConsumo(c.id);
                          setData(function(prev){ return { ...prev, consumosEmpleado: prev.consumosEmpleado.filter(function(x){ return x.id !== c.id; }) }; });
                        }
                      }} style={{ padding:"3px 10px", borderRadius:8, border:"2px solid #ffb3b3", background:"white", cursor:"pointer", fontSize:11, fontWeight:700, color:"#e74c3c", fontFamily:"Nunito, sans-serif" }}>
                        Eliminar
                      </button>
                      <span style={{ marginLeft:8, color:"#aaa", fontSize:11 }}>{abierto ? "▲" : "▼"}</span>
                    </td>
                  </tr>,
                  abierto && (
                    <tr key={c.id + "_det"}>
                      <td colSpan={7} style={{ padding:"0 14px 12px", background:C.violetaPale }}>
                        {c.items.map(function(it, j) {
                          return (
                            <div key={j} style={{ display:"flex", justifyContent:"space-between", fontSize:12, padding:"4px 0", borderBottom:"1px solid " + C.violetaLight }}>
                              <span>{it.nombre} x{it.cantidad}</span>
                              <span style={{ fontWeight:700 }}>{fmt(it.subtotal)}</span>
                            </div>
                          );
                        })}
                      </td>
                    </tr>
                  )
                ];
              })}
            </tbody>
          </table>
        </Card>
      )}
    {/* Modal editar consumo */}
    {consumoEditando && (
      <div style={{ position:"fixed", inset:0, background:"rgba(45,21,89,0.75)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200, padding:20 }}>
        <div style={{ background:"white", borderRadius:20, padding:"28px 24px", maxWidth:380, width:"100%", fontFamily:"Nunito, sans-serif", boxShadow:"0 24px 60px rgba(91,45,142,0.4)" }}>
          <h3 style={{ margin:"0 0 16px", color:C.violeta, fontFamily:"Baloo 2, cursive" }}>Editar consumo</h3>
          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:11, color:C.violeta, fontWeight:800, display:"block", marginBottom:6, textTransform:"uppercase" }}>Empleada que consumió</label>
            <div style={{ display:"flex", gap:8, marginBottom:8 }}>
              <button onClick={function(){ setEditModo("lista"); }}
                style={{ flex:1, padding:"7px", borderRadius:10, border:"2px solid " + (editModo === "lista" ? C.violeta : C.violetaLight), background: editModo === "lista" ? C.violeta : "white", color: editModo === "lista" ? "white" : C.violeta, fontWeight:700, cursor:"pointer", fontSize:12, fontFamily:"Nunito, sans-serif" }}>
                Del listado
              </button>
              <button onClick={function(){ setEditModo("manual"); }}
                style={{ flex:1, padding:"7px", borderRadius:10, border:"2px solid " + (editModo === "manual" ? C.violeta : C.violetaLight), background: editModo === "manual" ? C.violeta : "white", color: editModo === "manual" ? "white" : C.violeta, fontWeight:700, cursor:"pointer", fontSize:12, fontFamily:"Nunito, sans-serif" }}>
                Escribir nombre
              </button>
            </div>
            {editModo === "lista" ? (
              <select value={editConsumoUserId || ""} onChange={function(e){ setEditConsumoUserId(Number(e.target.value)); }}
                style={{ width:"100%", padding:"11px 14px", borderRadius:12, border:"2px solid " + C.violetaLight, fontSize:14, fontFamily:"Nunito, sans-serif", fontWeight:600, boxSizing:"border-box", outline:"none" }}>
                <option value="">Seleccioná una empleada</option>
                {empleados.map(function(u){ return <option key={u.id} value={u.id}>{u.nombre}</option>; })}
              </select>
            ) : (
              <input type="text" value={editConsumoNombre}
                onChange={function(e){ setEditConsumoNombre(e.target.value); }}
                placeholder="Nombre de la empleada"
                style={{ width:"100%", padding:"11px 14px", borderRadius:12, border:"2px solid " + C.violetaLight, fontSize:14, fontFamily:"Nunito, sans-serif", fontWeight:600, boxSizing:"border-box", outline:"none" }} />
            )}
          </div>
          <div style={{ marginBottom:16, background:C.violetaPale, borderRadius:12, padding:"10px 14px" }}>
            <div style={{ fontSize:12, color:C.violetaMed, fontWeight:700, marginBottom:6 }}>Productos</div>
            {consumoEditando.items && consumoEditando.items.map(function(it,i) {
              return (
                <div key={i} style={{ display:"flex", justifyContent:"space-between", fontSize:13, padding:"3px 0" }}>
                  <span>{it.nombre} x{it.cantidad}</span>
                  <span style={{ fontWeight:700 }}>{fmt(it.subtotal)}</span>
                </div>
              );
            })}
            <div style={{ display:"flex", justifyContent:"space-between", fontWeight:900, color:C.violeta, fontSize:14, borderTop:"1px solid " + C.violetaLight, paddingTop:6, marginTop:4 }}>
              <span>Total</span><span>{fmt(consumoEditando.total)}</span>
            </div>
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={function(){ setConsumoEditando(null); }}
              style={{ flex:1, padding:"11px", borderRadius:12, border:"2px solid " + C.violetaLight, background:"white", cursor:"pointer", fontWeight:700, fontFamily:"Nunito, sans-serif" }}>
              Cancelar
            </button>
            <button onClick={function() {
                var nombreFinal = editModo === "lista"
                  ? (empleados.find(function(u){ return u.id === editConsumoUserId; }) || {}).nombre || editConsumoNombre
                  : editConsumoNombre;
                var userIdFinal = editModo === "lista" ? editConsumoUserId : null;
                supabase.from('consumos_empleado').update({ usuario_nombre: nombreFinal, usuario_id: userIdFinal }).eq('id', consumoEditando.id);
                setData(function(prev) {
                  return { ...prev, consumosEmpleado: prev.consumosEmpleado.map(function(c) {
                    return c.id === consumoEditando.id ? { ...c, usuarioNombre: nombreFinal, usuario_nombre: nombreFinal, usuarioId: userIdFinal } : c;
                  })};
                });
                setConsumoEditando(null);
              }}
              style={{ flex:2, padding:"11px", borderRadius:12, border:"none", background:C.violeta, color:"white", fontWeight:800, cursor:"pointer", fontFamily:"Nunito, sans-serif", fontSize:14 }}>
              Guardar
            </button>
          </div>
        </div>
      </div>
    )}
    </div>
  );
}


// ─── TAB RETIROS (ADMIN) ─────────────────────────────────────────────────────
function TabRetiros({ data, setData }) {
  var hoyStr = hoy();
  var mesStr = hoyStr.slice(0,7);
  const [desde, setDesde] = useState(mesStr + "-01");
  const [hasta, setHasta] = useState(hoyStr);
  const [horaDesde, setHoraDesde] = useState("");
  const [horaHasta, setHoraHasta] = useState("");
  const [sucFiltro, setSucFiltro] = useState("");

  var filtroStyle = { padding:"8px 12px", borderRadius:10, border:"2px solid " + C.violetaLight, fontSize:13, fontFamily:"Nunito, sans-serif", fontWeight:600, color:C.dark, outline:"none", background:C.blanco };

  var retirosFiltrados = data.retiros.filter(function(r) {
    if (r.fecha < desde || r.fecha > hasta) return false;
    if (horaDesde && (r.hora || "00:00") < horaDesde) return false;
    if (horaHasta && (r.hora || "00:00") > horaHasta) return false;
    if (sucFiltro && r.sucursalNombre !== sucFiltro) return false;
    return true;
  }).sort(function(a,b) { return b.id - a.id; });

  var totalRetiros = retirosFiltrados.reduce(function(s,r) { return s + r.monto; }, 0);

  return (
    <div>
      <SectionTitle>Retiros de Caja</SectionTitle>

      <Card style={{ marginBottom:16, padding:"14px 18px" }}>
        <div style={{ display:"flex", flexWrap:"wrap", gap:8, alignItems:"center" }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
            <span style={{ fontSize:11, color:C.violetaMed, fontWeight:700 }}>Desde</span>
            <input type="date" value={desde} onChange={function(e){setDesde(e.target.value);}} style={filtroStyle} />
            <span style={{ fontSize:11, color:C.violetaMed, fontWeight:700 }}>Hasta</span>
            <input type="date" value={hasta} onChange={function(e){setHasta(e.target.value);}} style={filtroStyle} />
            <span style={{ fontSize:11, color:C.violetaMed, fontWeight:700 }}>Hora desde</span>
            <input type="time" value={horaDesde} onChange={function(e){setHoraDesde(e.target.value);}} style={filtroStyle} />
            <span style={{ fontSize:11, color:C.violetaMed, fontWeight:700 }}>Hora hasta</span>
            <input type="time" value={horaHasta} onChange={function(e){setHoraHasta(e.target.value);}} style={filtroStyle} />
          </div>
          <select value={sucFiltro} onChange={function(e){setSucFiltro(e.target.value);}} style={filtroStyle}>
            <option value="">Todas las sucursales</option>
            {data.sucursales.map(function(s) { return <option key={s.id} value={s.nombre}>{s.nombre}</option>; })}
          </select>
        </div>
      </Card>

      {/* Cards resumen */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(200px, 1fr))", gap:12, marginBottom:16 }}>
        <Card style={{ borderLeft:"4px solid #e74c3c", padding:"12px 16px" }}>
          <div style={{ fontSize:11, color:"#aaa", fontWeight:700, marginBottom:4 }}>TOTAL RETIRADO</div>
          <div style={{ fontSize:24, fontWeight:900, color:"#e74c3c" }}>{fmt(totalRetiros)}</div>
          <div style={{ fontSize:12, color:"#aaa" }}>{retirosFiltrados.length} retiro{retirosFiltrados.length !== 1 ? "s" : ""}</div>
        </Card>
      </div>

      {retirosFiltrados.length === 0 ? (
        <Card style={{ textAlign:"center", padding:40 }}>
          <div style={{ fontSize:40 }}>💸</div>
          <p style={{ color:C.violetaLight, fontWeight:700 }}>No hay retiros en ese período</p>
        </Card>
      ) : (
        <Card style={{ padding:0, overflow:"hidden" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
            <thead>
              <tr style={{ background:C.violetaPale }}>
                {["Fecha", "Hora", "Sucursal", "Empleada", "Motivo", "Monto", "Acciones"].map(function(h,i) {
                  return <th key={i} style={{ padding:"10px 14px", textAlign:i>=5?"right":"left", color:C.violeta, fontWeight:800, fontSize:11, textTransform:"uppercase" }}>{h}</th>;
                })}
              </tr>
            </thead>
            <tbody>
              {retirosFiltrados.map(function(r, idx) {
                return (
                  <tr key={r.id} style={{ borderTop:"1px solid " + C.violetaPale, background: idx%2===0 ? C.blanco : C.crema }}>
                    <td style={{ padding:"9px 14px" }}>{fechaLegible(r.fecha)}</td>
                    <td style={{ padding:"9px 14px", color:C.violetaMed }}>{r.hora}</td>
                    <td style={{ padding:"9px 14px", color:"#888" }}>{r.sucursalNombre}</td>
                    <td style={{ padding:"9px 14px", fontWeight:700 }}>{r.usuarioNombre}</td>
                    <td style={{ padding:"9px 14px" }}>{r.motivo}</td>
                    <td style={{ padding:"9px 14px", textAlign:"right", fontWeight:900, color:"#e74c3c" }}>{fmt(r.monto)}</td>
                    <td style={{ padding:"9px 14px", textAlign:"right" }}>
                      <div style={{ display:"flex", gap:4, justifyContent:"flex-end" }}>
                        <button onClick={function() {
                            var nuevoMotivo = window.prompt("Motivo:", r.motivo);
                            if (nuevoMotivo === null) return;
                            var nuevoMonto = window.prompt("Monto:", r.monto);
                            if (nuevoMonto === null) return;
                            actualizarRetiro(r.id, { motivo: nuevoMotivo, monto: Number(nuevoMonto) });
                            setData(function(prev) { return { ...prev, retiros: prev.retiros.map(function(x) { return x.id===r.id ? {...x, motivo:nuevoMotivo, monto:Number(nuevoMonto)} : x; }) }; });
                          }}
                          style={{ padding:"4px 10px", borderRadius:8, border:"2px solid " + C.violeta, background:C.blanco, cursor:"pointer", fontSize:11, fontWeight:700, color:C.violeta, fontFamily:"Nunito, sans-serif" }}>
                          Editar
                        </button>
                        <button onClick={function() {
                            if (window.confirm("¿Eliminar este retiro?")) {
                              eliminarRetiro(r.id);
                              setData(function(prev) { return { ...prev, retiros: prev.retiros.filter(function(x){ return x.id !== r.id; }) }; });
                            }
                          }}
                          style={{ padding:"4px 10px", borderRadius:8, border:"2px solid #ffb3b3", background:C.blanco, cursor:"pointer", fontSize:11, fontWeight:700, color:"#e74c3c", fontFamily:"Nunito, sans-serif" }}>
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

// ─── TAB PRODUCTOS ─────────────────────────────────────────────────────────────
function TabProductos({ data, setData }) {
  const [subTab, setSubTab] = useState("productos"); // "productos" | "insumos"
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ nombre: "", precio: "", costo: "", stockKg: "", emoji: "🍦", categoria: "productos", tipoCosto: "fijo", receta: [] });
  const emojis = ["🍦", "🍧", "🍨", "🥤", "🍌", "⭐", "🥛", "🍫", "🍓", "🍑", "🥭", "🧁", "🍬", "🍰", "🍭", "🎂", "📦", "🧊", "🍋", "❤️", "🎁", "⚡"];

  const costoCalculado = (f) => {
    if (f.tipoCosto === "receta" && f.receta && f.receta.length > 0) {
      return f.receta.reduce((t, linea) => {
        const ins = data.insumos.find(i => i.id === linea.insumoId);
        return t + (ins ? ins.costo * linea.cantidad : 0);
      }, 0);
    }
    return Number(f.costo) || 0;
  };

  const abrirForm = (prod = null) => {
    if (!prod) {
      setForm({ nombre: "", precio: "", costo: "", stockKg: "", emoji: "🍦", categoria: "productos", tipoCosto: "fijo", receta: [] });
      setEditando("nuevo");
      return;
    }
    const recetaSegura = Array.isArray(prod.receta)
      ? prod.receta.map(r => ({ insumoId: Number(r.insumoId), cantidad: Number(r.cantidad) || 1 }))
      : [];
    setForm({
      nombre: String(prod.nombre || ""),
      precio: prod.precio != null ? prod.precio : "",
      costo: prod.costo != null ? prod.costo : "",
      stockKg: prod.stockKg != null ? prod.stockKg : "",
      emoji: prod.emoji || "🍦",
      categoria: prod.categoria || "productos",
      tipoCosto: prod.tipoCosto || "fijo",
      receta: recetaSegura,
    });
    setEditando(prod.id);
  };

  const agregarLineaReceta = () => {
    setForm(f => ({ ...f, receta: [...f.receta, { insumoId: Number(data.insumos[0] ? data.insumos[0].id : null) || null, cantidad: 1 }] }));
  };

  const actualizarLinea = (idx, campo, valor) => {
    setForm(f => ({ ...f, receta: f.receta.map((l, i) => i === idx ? { ...l, [campo]: Number(valor) } : l) }));
  };

  const eliminarLinea = (idx) => {
    setForm(f => ({ ...f, receta: f.receta.filter((_, i) => i !== idx) }));
  };

  const guardar = () => {
    if (!form.nombre || !form.precio) return;
    const costoFinal = costoCalculado(form);
    var prodData = { nombre: form.nombre, precio: Number(form.precio), costo: costoFinal, stockKg: Number(form.stockKg) || 0, emoji: form.emoji, categoria: form.categoria, tipoCosto: form.tipoCosto, receta: form.tipoCosto === "receta" ? form.receta : [], activo: true };
    if (editando === "nuevo") {
      var tempId = Date.now();
      guardarProducto({ ...prodData, id: null }).then(function(nuevo) {
        var finalId = nuevo ? nuevo.id : tempId;
        setData(function(prev) { return { ...prev, productos: [...prev.productos, { id: finalId, ...prodData }] }; });
      });
    } else {
      guardarProducto({ ...prodData, id: editando });
      setData(function(prev) { return { ...prev, productos: prev.productos.map(function(p) { return p.id === editando ? { ...p, ...prodData } : p; }) }; });
    }
    setEditando(null);
  };

  const toggleActivo = function(id) {
    var prod = data.productos.find(function(p) { return p.id === id; });
    if (!prod) return;
    var nuevoActivo = !prod.activo;
    guardarProducto({ ...prod, activo: nuevoActivo, id: id });
    setData(function(prev) { return { ...prev, productos: prev.productos.map(function(p) { return p.id === id ? { ...p, activo: nuevoActivo } : p; }) }; });
  };

  // Recalcular costos de receta al cambiar insumos
  const productosConCosto = data.productos.map(p => ({ ...p, costoReal: calcularCosto(p, data.insumos) }));

  const inputStyle = { width: "100%", padding: "10px 14px", borderRadius: 12, border: `2px solid ${C.violetaLight}`, fontSize: 14, fontFamily: "Nunito, sans-serif", fontWeight: 600, boxSizing: "border-box", outline: "none" };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <SectionTitle>Productos</SectionTitle>
        <button onClick={() => abrirForm()} style={{ padding: "10px 20px", borderRadius: 12, border: "none", background: C.violeta, color: C.blanco, fontWeight: 800, cursor: "pointer", fontSize: 14, fontFamily: "Nunito, sans-serif", boxShadow: `0 4px 14px rgba(91,45,142,0.35)` }}>
          + Nuevo producto
        </button>
      </div>

      {/* Sub-tabs Productos / Insumos */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {[{ key: "productos", label: "🍦 Productos" }, { key: "insumos", label: "🧂 Insumos" }].map(t => (
          <button key={t.key} onClick={() => setSubTab(t.key)}
            style={{ padding: "8px 20px", borderRadius: 20, border: "none", background: subTab === t.key ? C.violeta : C.violetaPale, color: subTab === t.key ? C.blanco : C.violeta, fontWeight: 800, cursor: "pointer", fontSize: 13, fontFamily: "Nunito, sans-serif" }}>
            {t.label}
          </button>
        ))}
      </div>

      {subTab === "insumos" && <TabInsumos data={data} setData={setData} />}

      {subTab === "productos" && (
        <>
          {/* Banner stock */}
          {(() => {
            const sinStock = data.productos.filter(p => !p.activo);
            return sinStock.length > 0 ? (
              <div style={{ background: "#ffe8e8", border: "1px solid #ffb3b3", borderRadius: 12, padding: "10px 16px", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 18 }}>⚠️</span>
                <span style={{ color: "#c0392b", fontWeight: 700, fontSize: 13 }}>
                  {sinStock.length} producto{sinStock.length > 1 ? "s" : ""} sin stock: {sinStock.map(p => p.nombre).join(", ")}
                </span>
              </div>
            ) : (
              <div style={{ background: C.mentaPale, borderRadius: 12, padding: "10px 16px", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 18 }}>✅</span>
                <span style={{ color: "#2a7a5e", fontWeight: 700, fontSize: 13 }}>Todos los productos tienen stock disponible</span>
              </div>
            );
          })()}

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {productosConCosto.map((p, i) => {
              const margen = p.precio > 0 ? Math.round(((p.precio - p.costoReal) / p.precio) * 100) : 0;
              return (
                <Card key={p.id} style={{ padding: "12px 16px", opacity: p.activo ? 1 : 0.6, borderLeft: `4px solid ${p.activo ? C.violeta : "#ddd"}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    {/* Emoji + nombre */}
                    <span style={{ fontSize: 26, flexShrink: 0 }}>{p.emoji}</span>
                    <div style={{ flex: 1, minWidth: 120 }}>
                      <div style={{ fontWeight: 900, color: C.dark, fontSize: 14, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        {p.nombre}
                        {p.tipoCosto === "receta" && <span style={{ fontSize: 10, background: C.amarilloLight, color: "#8a6500", padding: "1px 6px", borderRadius: 6, fontWeight: 700 }}>RECETA</span>}
                      </div>
                      <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 11, background: p.categoria === "promos" ? C.amarilloLight : p.categoria === "pedidoya" ? C.mentaPale : C.violetaPale, color: p.categoria === "promos" ? "#8a6500" : p.categoria === "pedidoya" ? "#2a7a5e" : C.violeta, padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>
                          {p.categoria === "promos" ? "⭐ Promo" : p.categoria === "pedidoya" ? "📦 Ped.Ya" : "🍦 Prod."}
                        </span>
                        {p.stockKg > 0 && <span style={{ fontSize: 11, background: C.mentaPale, color: "#2a7a5e", padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>{p.stockKg} kg</span>}
                      </div>
                    </div>

                    {/* Precio / Costo / Margen */}
                    <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 10, color: "#aaa", fontWeight: 700, textTransform: "uppercase" }}>Precio</div>
                        <div style={{ fontWeight: 900, color: "#2980b9", fontSize: 14 }}>{fmt(p.precio)}</div>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 10, color: "#aaa", fontWeight: 700, textTransform: "uppercase" }}>Costo</div>
                        <div style={{ fontWeight: 800, color: "#e74c3c", fontSize: 14 }}>{fmt(p.costoReal)}</div>
                        {p.tipoCosto === "receta" && <div style={{ fontSize: 9, color: "#aaa" }}>auto</div>}
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 10, color: "#aaa", fontWeight: 700, textTransform: "uppercase" }}>Margen</div>
                        <span style={{ background: margen >= 50 ? C.mentaPale : C.amarilloLight, color: margen >= 50 ? "#2a7a5e" : "#8a6500", padding: "3px 10px", borderRadius: 10, fontWeight: 900, fontSize: 13 }}>{margen}%</span>
                      </div>
                    </div>

                    {/* Estado + botones */}
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                      <span style={{ background: p.activo ? C.mentaPale : "#ffe8e8", color: p.activo ? "#2a7a5e" : "#c0392b", padding: "4px 10px", borderRadius: 10, fontSize: 12, fontWeight: 800 }}>
                        {p.activo ? "✅ Stock" : "❌ Sin stock"}
                      </span>
                      <button
                        onClick={() => { const prod = data.productos.find(orig => orig.id === p.id); abrirForm(prod || p); }}
                        style={{ padding: "7px 14px", borderRadius: 10, border: `2px solid ${C.violeta}`, background: C.blanco, cursor: "pointer", fontSize: 12, fontWeight: 800, color: C.violeta, fontFamily: "Nunito, sans-serif" }}>
                        ✏️ Editar
                      </button>
                      <button
                        onClick={() => toggleActivo(p.id)}
                        style={{ padding: "7px 14px", borderRadius: 10, border: p.activo ? "2px solid #ffb3b3" : "2px solid #a8e6cf", background: C.blanco, cursor: "pointer", fontSize: 12, fontWeight: 800, color: p.activo ? "#e74c3c" : "#27ae60", fontFamily: "Nunito, sans-serif" }}>
                        {p.activo ? "Sin stock" : "Activar"}
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Modal editar/nuevo producto */}
      {editando && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(45,21,89,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}>
          <Card style={{ maxWidth: 480, width: "100%", maxHeight: "92vh", overflowY: "auto" }}>
            <h3 style={{ margin: "0 0 20px", color: C.violeta, fontFamily: "Baloo 2, cursive" }}>{editando === "nuevo" ? "Nuevo producto" : "Editar producto"}</h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Emoji */}
              <div>
                <label style={{ fontSize: 12, color: C.violeta, fontWeight: 800, display: "block", marginBottom: 5, textTransform: "uppercase" }}>Ícono</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {emojis.map(e => (
                    <button key={e} onClick={() => setForm(f => ({ ...f, emoji: e }))}
                      style={{ fontSize: 22, padding: "6px 8px", borderRadius: 10, border: form.emoji === e ? `3px solid ${C.violeta}` : "3px solid transparent", background: form.emoji === e ? C.violetaPale : C.crema, cursor: "pointer" }}>
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              {/* Categoría */}
              <div>
                <label style={{ fontSize: 12, color: C.violeta, fontWeight: 800, display: "block", marginBottom: 5, textTransform: "uppercase" }}>Categoría</label>
                <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))} style={inputStyle}>
                  <option value="productos">🍦 Productos</option>
                  <option value="promos">⭐ Promos</option>
                  <option value="pedidoya">📦 Pedido Ya</option>
                </select>
              </div>

              {/* Nombre y precio */}
              {[["nombre", "Nombre del producto", "text"], ["precio", "Precio de venta ($)", "number"], ["stockKg", "Stock en Kg (ej: 0.25 = 1/4 Kg)", "number"]].map(([key, label, type]) => (
                <div key={key}>
                  <label style={{ fontSize: 12, color: C.violeta, fontWeight: 800, display: "block", marginBottom: 5, textTransform: "uppercase" }}>{label}</label>
                  <input type={type} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={inputStyle} />
                </div>
              ))}

              {/* Tipo de costo */}
              <div>
                <label style={{ fontSize: 12, color: C.violeta, fontWeight: 800, display: "block", marginBottom: 8, textTransform: "uppercase" }}>Tipo de costo</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {[{ key: "fijo", label: "💰 Costo fijo" }, { key: "receta", label: "🧂 Por insumos (receta)" }].map(t => (
                    <button key={t.key} onClick={() => setForm(f => ({ ...f, tipoCosto: t.key }))}
                      style={{ flex: 1, padding: "10px", borderRadius: 12, border: form.tipoCosto === t.key ? "3px solid " + C.violeta : "3px solid " + C.violetaLight, background: form.tipoCosto === t.key ? C.violetaPale : C.blanco, color: C.violeta, fontWeight: 800, cursor: "pointer", fontSize: 13, fontFamily: "Nunito, sans-serif" }}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Costo fijo */}
              {form.tipoCosto === "fijo" && (
                <div>
                  <label style={{ fontSize: 12, color: C.violeta, fontWeight: 800, display: "block", marginBottom: 5, textTransform: "uppercase" }}>Costo ($)</label>
                  <input type="number" value={form.costo} onChange={e => setForm(f => ({ ...f, costo: e.target.value }))} style={inputStyle} placeholder="0" />
                </div>
              )}

              {/* Receta por insumos */}
              {form.tipoCosto === "receta" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <label style={{ fontSize: 12, color: C.violeta, fontWeight: 800, textTransform: "uppercase" }}>Insumos de la receta</label>
                    <button onClick={agregarLineaReceta} style={{ padding: "5px 12px", borderRadius: 8, border: "none", background: C.violeta, color: C.blanco, fontWeight: 800, cursor: "pointer", fontSize: 12, fontFamily: "Nunito, sans-serif" }}>
                      + Agregar insumo
                    </button>
                  </div>

                  {form.receta.length === 0 && (
                    <div style={{ background: C.crema, borderRadius: 10, padding: "12px", textAlign: "center", color: "#aaa", fontSize: 13 }}>
                      Agregá los insumos que componen este producto
                    </div>
                  )}

                  {form.receta.map((linea, idx) => {
                    const ins = data.insumos.find(i => i.id === linea.insumoId);
                    const subtotal = ins ? ins.costo * linea.cantidad : 0;
                    return (
                      <div key={idx} style={{ display: "flex", gap: 8, alignItems: "center", background: C.crema, borderRadius: 10, padding: "8px 10px", marginBottom: 6 }}>
                        <select value={linea.insumoId} onChange={e => actualizarLinea(idx, "insumoId", e.target.value)}
                          style={{ flex: 2, padding: "8px 10px", borderRadius: 8, border: `2px solid ${C.violetaLight}`, fontSize: 13, fontFamily: "Nunito, sans-serif", fontWeight: 600, outline: "none" }}>
                          {data.insumos.map(i => <option key={i.id} value={i.id}>{i.nombre} — {fmt(i.costo)}</option>)}
                        </select>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <label style={{ fontSize: 11, color: "#888", fontWeight: 700 }}>x</label>
                          <input type="number" value={linea.cantidad} min="0.01" step="0.01"
                            onChange={e => actualizarLinea(idx, "cantidad", e.target.value)}
                            style={{ width: 60, padding: "8px", borderRadius: 8, border: `2px solid ${C.violetaLight}`, fontSize: 13, fontWeight: 700, textAlign: "center", outline: "none" }} />
                        </div>
                        <span style={{ fontSize: 12, color: "#e74c3c", fontWeight: 700, minWidth: 60, textAlign: "right" }}>{fmt(subtotal)}</span>
                        <button onClick={() => eliminarLinea(idx)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#e74c3c", padding: "0 4px" }}>✕</button>
                      </div>
                    );
                  })}

                  {form.receta.length > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", background: C.violetaPale, borderRadius: 10, padding: "10px 14px", marginTop: 4 }}>
                      <span style={{ fontWeight: 800, color: C.violeta }}>Costo total calculado:</span>
                      <span style={{ fontWeight: 900, color: "#e74c3c", fontSize: 16 }}>{fmt(costoCalculado(form))}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={() => setEditando(null)} style={{ flex: 1, padding: "11px", borderRadius: 12, border: `2px solid ${C.violetaLight}`, background: C.blanco, cursor: "pointer", fontWeight: 700, fontFamily: "Nunito, sans-serif" }}>Cancelar</button>
              <button onClick={guardar} style={{ flex: 2, padding: "11px", borderRadius: 12, border: "none", background: C.violeta, color: C.blanco, fontWeight: 800, cursor: "pointer", fontFamily: "Nunito, sans-serif", fontSize: 14, boxShadow: `0 4px 14px rgba(91,45,142,0.35)` }}>Guardar</button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// ─── TAB USUARIOS ─────────────────────────────────────────────────────────────
function TabUsuarios({ data, setData }) {
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ nombre: "", clave: "", rol: "empleada", sucursal_id: "" });

  const abrirForm = (u = null) => {
    setEditando(u ? u.id : "nuevo");
    setForm(u ? { nombre: u.nombre, clave: u.clave, rol: u.rol, sucursal_id: u.sucursal_id || "" } : { nombre: "", clave: "", rol: "empleada", sucursal_id: "" });
  };

  const guardar = () => {
    if (!form.nombre || !form.clave) return;
    var usuData = { ...form, sucursal_id: form.sucursal_id ? Number(form.sucursal_id) : null };
    if (editando === "nuevo") {
      guardarUsuario(usuData).then(function(nuevo) {
        setData(function(prev) { return { ...prev, usuarios: [...prev.usuarios, { id: nuevo ? nuevo.id : Date.now(), ...usuData }] }; });
      });
    } else {
      guardarUsuario({ ...usuData, id: editando });
      setData(function(prev) { return { ...prev, usuarios: prev.usuarios.map(function(u) { return u.id === editando ? { ...u, ...usuData } : u; }) }; });
    }
    setEditando(null);
  };

  const eliminar = (id) => { if (window.confirm("¿Eliminar este usuario?")) setData((prev) => ({ ...prev, usuarios: prev.usuarios.filter((u) => u.id !== id) })); };

  const inputStyle = { width: "100%", padding: "10px 14px", borderRadius: 12, border: `2px solid ${C.violetaLight}`, fontSize: 14, fontFamily: "Nunito, sans-serif", fontWeight: 600, boxSizing: "border-box", outline: "none" };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <SectionTitle>Usuarios</SectionTitle>
        <button onClick={() => abrirForm()}
          style={{ padding: "10px 20px", borderRadius: 12, border: "none", background: C.violeta, color: C.blanco, fontWeight: 800, cursor: "pointer", fontSize: 14, fontFamily: "Nunito, sans-serif", boxShadow: `0 4px 14px rgba(91,45,142,0.35)` }}>
          + Nueva empleada
        </button>
      </div>

      <Card style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: C.violetaPale }}>
              {["Nombre", "Rol", "Sucursal", "Clave", "Acciones"].map((h) => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: C.violeta, fontWeight: 800, fontSize: 11, textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.usuarios.map((u, i) => (
              <tr key={u.id} style={{ borderTop: `1px solid ${C.violetaPale}`, background: i % 2 === 0 ? C.blanco : C.crema }}>
                <td style={{ padding: "12px 16px", fontWeight: 800, color: C.dark }}>
                  <span style={{ fontSize: 16, marginRight: 8 }}>{u.rol === "admin" ? "⚙️" : "🍦"}</span>{u.nombre}
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <span style={{ background: u.rol === "admin" ? C.amarilloLight : C.violetaPale, color: u.rol === "admin" ? "#8a6500" : C.violeta, padding: "4px 12px", borderRadius: 10, fontSize: 12, fontWeight: 800 }}>
                    {u.rol === "admin" ? "Administrador" : "Empleada"}
                  </span>
                </td>
                <td style={{ padding: "12px 16px", color: C.violetaMed, fontWeight: 600 }}>
                  {u.sucursal_id ? (data.sucursales.find((s) => s.id === u.sucursal_id) || {}).nombre : "—"}
                </td>
                <td style={{ padding: "12px 16px", fontFamily: "monospace", color: "#bbb", letterSpacing: 2 }}>{"•".repeat(u.clave.length)}</td>
                <td style={{ padding: "12px 16px" }}>
                  <button onClick={() => abrirForm(u)} style={{ padding: "5px 12px", borderRadius: 8, border: `2px solid ${C.violetaLight}`, background: C.blanco, cursor: "pointer", fontSize: 11, fontWeight: 700, color: C.violeta, fontFamily: "Nunito, sans-serif", marginRight: 6 }}>Editar</button>
                  {u.rol !== "admin" && <button onClick={() => eliminar(u.id)} style={{ padding: "5px 12px", borderRadius: 8, border: "2px solid #ffb3b3", background: C.blanco, color: "#e74c3c", cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: "Nunito, sans-serif" }}>Eliminar</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {editando && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(45,21,89,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}>
          <Card style={{ maxWidth: 360, width: "100%" }}>
            <h3 style={{ margin: "0 0 20px", color: C.violeta, fontFamily: "Baloo 2, cursive" }}>{editando === "nuevo" ? "Nueva empleada" : "Editar usuario"}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[["nombre", "Nombre completo", "text"], ["clave", "Clave de acceso", "password"]].map(([key, label, type]) => (
                <div key={key}>
                  <label style={{ fontSize: 12, color: C.violeta, fontWeight: 800, display: "block", marginBottom: 5, textTransform: "uppercase" }}>{label}</label>
                  <input type={type} value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} style={inputStyle} />
                </div>
              ))}
              <div>
                <label style={{ fontSize: 12, color: C.violeta, fontWeight: 800, display: "block", marginBottom: 5, textTransform: "uppercase" }}>Rol</label>
                <select value={form.rol} onChange={(e) => setForm((f) => ({ ...f, rol: e.target.value }))} style={inputStyle}>
                  <option value="empleada">Empleada</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              {form.rol === "empleada" && (
                <div>
                  <label style={{ fontSize: 12, color: C.violeta, fontWeight: 800, display: "block", marginBottom: 5, textTransform: "uppercase" }}>Sucursal</label>
                  <select value={form.sucursal_id} onChange={(e) => setForm((f) => ({ ...f, sucursal_id: e.target.value }))} style={inputStyle}>
                    <option value="">— Seleccionar —</option>
                    {data.sucursales.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={() => setEditando(null)} style={{ flex: 1, padding: "11px", borderRadius: 12, border: `2px solid ${C.violetaLight}`, background: C.blanco, cursor: "pointer", fontWeight: 700, fontFamily: "Nunito, sans-serif" }}>Cancelar</button>
              <button onClick={guardar} style={{ flex: 2, padding: "11px", borderRadius: 12, border: "none", background: C.violeta, color: C.blanco, fontWeight: 800, cursor: "pointer", fontFamily: "Nunito, sans-serif", boxShadow: `0 4px 14px rgba(91,45,142,0.35)` }}>Guardar</button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [data, setData] = useState(INITIAL_DATA);
  const [sesion, setSesion] = useState(null);
  const [cajaActiva, setCajaActiva] = useState(null);
  const [cargando, setCargando] = useState(true);

  // Cargar datos desde Supabase al iniciar
  useEffect(function() {
    cargarDatos().then(function(datos) {
      setData(datos);
      setCargando(false);
      // Verificar si hay sesión admin guardada
      try {
        var adminId = localStorage.getItem("venecia_admin_id");
        if (adminId) {
          var adminUser = datos.usuarios.find(function(u) { return u.id === Number(adminId) && u.rol === "admin"; });
          if (adminUser) {
            setSesion({ usuario: adminUser, sucursal: null });
          }
        }
      } catch(e) {}
    }).catch(function() {
      setCargando(false);
    });
  }, []);

  // Recargar datos cada 30 segundos (para ver cambios de otras sucursales)
  useEffect(function() {
    var interval = setInterval(function() {
      cargarDatos().then(function(datos) { setData(datos); });
    }, 30000);
    return function() { clearInterval(interval); };
  }, []);

  const handleLogin = async function(s) {
    setSesion(s);
    // Recargar datos frescos de Supabase para tener el estado real de cajas
    var datosActuales = await cargarDatos();
    setData(datosActuales);
    // Buscar si hay caja abierta para este usuario en esta sucursal
    var cajaExistente = datosActuales.cajas.find(function(c) {
      return (c.cerrada === false || c.cerrada === null || c.cerrada === 0)
        && c.usuario_id === s.usuario.id 
        && c.sucursal_id === s.sucursal.id;
    });
    if (cajaExistente) {
      setCajaActiva({
        id: cajaExistente.id,
        usuarioId: cajaExistente.usuario_id,
        usuarioNombre: cajaExistente.usuario_nombre,
        sucursalId: cajaExistente.sucursal_id,
        sucursalNombre: cajaExistente.sucursal_nombre,
        fecha: cajaExistente.fecha,
        horaApertura: cajaExistente.hora_apertura,
        montoInicial: cajaExistente.monto_inicial || 0,
        cerrada: false,
      });
    } else {
      setCajaActiva(null);
    }
  };

  const handleAbrirCaja = async function(montoInicial) {
    var nuevaCaja = {
      id: Date.now(),
      usuarioId: sesion.usuario.id,
      usuarioNombre: sesion.usuario.nombre,
      sucursalId: sesion.sucursal.id,
      sucursalNombre: sesion.sucursal.nombre,
      fecha: hoy(),
      horaApertura: ahora(),
      horaCierre: null,
      montoInicial,
      cerrada: false,
    };
    console.log('Abriendo caja con id:', nuevaCaja.id);
    await guardarCaja(nuevaCaja);
    setData(function(prev) { return { ...prev, cajas: [...prev.cajas, { ...nuevaCaja, sucursal_id: nuevaCaja.sucursalId, hora_apertura: nuevaCaja.horaApertura }] }; });
    setCajaActiva(nuevaCaja);
  };

  const handleCerrarCaja = function() {
    setCajaActiva(null);
    setSesion(null);
  };

  const handleLogout = function() {
    try { localStorage.removeItem("venecia_admin_id"); } catch(e) {}
    setSesion(null);
    setCajaActiva(null);
  };

  if (cargando) return (
    <div style={{ minHeight:"100vh", background:"#5B2D8E", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:16 }}>
      <div style={{ fontSize:60 }}>🍦</div>
      <div style={{ color:"white", fontSize:20, fontFamily:"sans-serif", fontWeight:700 }}>Cargando Venecia...</div>
    </div>
  );

  if (!sesion) return <Login data={data} onLogin={handleLogin} />;
  if (sesion.usuario.rol === "admin") return <Admin data={data} setData={setData} onLogout={handleLogout} />;
  if (!cajaActiva) return <AperturaCaja sesion={sesion} onAbrir={handleAbrirCaja} data={data} />;
  return <POS data={data} setData={setData} sesion={sesion} caja={cajaActiva} onCerrarCaja={handleCerrarCaja} onLogout={handleLogout} />;
}
