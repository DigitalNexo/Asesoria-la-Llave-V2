# ⚡ Comandos Rápidos - Asesoría La Llave VPS

## 🎯 LO MÁS IMPORTANTE (Lee esto primero)

Cuando programas desde VSCode conectado por SSH y haces cambios:

```bash
./deploy.sh
```

**¡ESO ES TODO!** 🎉

---

## 📜 Scripts Disponibles

### `./deploy.sh`
**Usa este 99% de las veces**
- Construye la aplicación
- Reinicia el servicio
- Verifica que todo funcione

### `./deploy-with-db.sh`
**Úsalo cuando cambies el schema de Prisma**
- Actualiza Prisma
- Aplica cambios a la DB
- Construye y reinicia

### `./quick-restart.sh`
**Úsalo cuando solo cambies .env**
- Reinicia el servicio sin build
- Más rápido

### `./check-status.sh`
**Úsalo para diagnosticar problemas**
- Muestra estado completo del sistema
- Verifica servicio, puerto, DB, logs

---

## 🔧 Comandos Systemd

```bash
# Ver estado
systemctl status asesoria-llave

# Reiniciar
systemctl restart asesoria-llave

# Detener
systemctl stop asesoria-llave

# Iniciar
systemctl start asesoria-llave

# Ver logs en tiempo real
journalctl -u asesoria-llave -f

# Ver últimos 50 logs
journalctl -u asesoria-llave -n 50
```

---

## 🚦 Escenarios Comunes

### ✏️ Cambié código en VSCode
```bash
./deploy.sh
```

### 🗄️ Cambié el schema de Prisma
```bash
./deploy-with-db.sh
```

### ⚙️ Cambié solo .env
```bash
./quick-restart.sh
```

### 📦 Instalé un paquete npm
```bash
npm install
./deploy.sh
```

### 🐛 Algo no funciona, quiero ver qué pasa
```bash
./check-status.sh
journalctl -u asesoria-llave -f
```

---

## 📚 Documentación Completa

Lee [DESARROLLO-VPS.md](DESARROLLO-VPS.md) para la guía completa y detallada.

---

## ❓ FAQ Rápido

**P: ¿El servicio se inicia al reiniciar la VPS?**
R: Sí, automáticamente.

**P: ¿Dónde están los logs?**
R: `journalctl -u asesoria-llave -f`

**P: ¿Cómo sé si está funcionando?**
R: `systemctl status asesoria-llave` o `./check-status.sh`

**P: ¿Qué puerto usa?**
R: 5000 (configurable en .env)

**P: ¿Puedo usar npm run dev?**
R: NO en producción. Solo `./deploy.sh`

---

**Más dudas?** → Lee [DESARROLLO-VPS.md](DESARROLLO-VPS.md)