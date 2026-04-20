import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://eusshllmrdwsudpskglz.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1c3NobGxtcmR3c3VkcHNrZ2x6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2MzkxNDAsImV4cCI6MjA5MjIxNTE0MH0.Z9Istp3XQJJU82Djmjau4qsARNgUWx9W2TsuTrKZv3k'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ── Helpers de base de datos ──────────────────────────────────────────────────

export async function cargarDatos() {
  const [
    { data: sucursales },
    { data: usuarios },
    { data: productos },
    { data: insumos },
    { data: cajas },
    { data: ventas },
    { data: retiros },
    { data: consumosEmpleado },
  ] = await Promise.all([
    supabase.from('sucursales').select('*').order('id'),
    supabase.from('usuarios').select('*').order('id'),
    supabase.from('productos').select('*').order('id'),
    supabase.from('insumos').select('*').order('id'),
    supabase.from('cajas').select('*').order('id'),
    supabase.from('ventas').select('*').order('id'),
    supabase.from('retiros').select('*').order('id'),
    supabase.from('consumos_empleado').select('*').order('id'),
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
    cajas: cajas || [],
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

export async function guardarVenta(venta) {
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

export async function actualizarVenta(id, cambios) {
  await supabase.from('ventas').update({
    items: cambios.items,
    forma_pago: cambios.formaPago,
    total: cambios.total,
    costo_total: cambios.costo_total,
    editada: true,
  }).eq('id', id)
}

export async function guardarCaja(caja) {
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

export async function cerrarCaja(id, horaCierre) {
  await supabase.from('cajas').update({
    hora_cierre: horaCierre,
    cerrada: true,
  }).eq('id', id)
}

export async function guardarRetiro(retiro) {
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

export async function guardarConsumo(consumo) {
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

export async function guardarProducto(producto) {
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

export async function guardarInsumo(insumo) {
  if (insumo.id) {
    await supabase.from('insumos').update({ nombre: insumo.nombre, costo: insumo.costo }).eq('id', insumo.id)
  } else {
    const { data: nuevo } = await supabase.from('insumos').insert({ nombre: insumo.nombre, costo: insumo.costo }).select().single()
    return nuevo
  }
}

export async function eliminarInsumo(id) {
  await supabase.from('insumos').delete().eq('id', id)
}

export async function guardarUsuario(usuario) {
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

export async function eliminarUsuario(id) {
  await supabase.from('usuarios').delete().eq('id', id)
}
