var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/prisma-client.ts
import { PrismaClient as PrismaClient4 } from "@prisma/client";
var prismaClientSingleton, prisma4, prisma_client_default;
var init_prisma_client = __esm({
  "server/prisma-client.ts"() {
    prismaClientSingleton = () => {
      return new PrismaClient4({
        log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
        datasources: {
          db: {
            url: process.env.DATABASE_URL
          }
        }
      });
    };
    prisma4 = globalThis.prismaGlobal ?? prismaClientSingleton();
    if (process.env.NODE_ENV !== "production") {
      globalThis.prismaGlobal = prisma4;
    }
    prisma4.$connect().catch((err) => {
      console.error("Error conectando a la base de datos:", err);
      process.exit(1);
    });
    process.on("beforeExit", async () => {
      await prisma4.$disconnect();
    });
    prisma_client_default = prisma4;
  }
});

// server/services/budgets/calculateAutonomo.ts
var calculateAutonomo_exports = {};
__export(calculateAutonomo_exports, {
  calculateAutonomo: () => calculateAutonomo,
  clearConfigCache: () => clearConfigCache,
  getConfiguracionActual: () => getConfiguracionActual
});
async function getConfiguracion() {
  const now = Date.now();
  if (configCache && now - cacheTimestamp2 < CACHE_DURATION2) {
    return configCache;
  }
  const config = await prisma_client_default.gestoria_budget_autonomo_config.findFirst({
    where: { activo: true },
    include: {
      tramosFacturas: {
        orderBy: { orden: "asc" }
      },
      tramosNominas: {
        orderBy: { orden: "asc" }
      },
      tramosFacturacionAnual: {
        orderBy: { orden: "asc" }
      },
      preciosModelosFiscales: {
        where: { activo: true },
        orderBy: { orden: "asc" }
      },
      preciosServiciosAdicionales: {
        where: { activo: true },
        orderBy: { orden: "asc" }
      }
    }
  });
  if (!config) {
    throw new Error("No se encontr\xF3 configuraci\xF3n activa para presupuestos de Aut\xF3nomos");
  }
  configCache = {
    id: config.id,
    porcentajePeriodoMensual: Number(config.porcentajePeriodoMensual),
    porcentajeEDN: Number(config.porcentajeEDN),
    porcentajeModulos: Number(config.porcentajeModulos),
    minimoMensual: Number(config.minimoMensual),
    tramosFacturas: config.tramosFacturas.map((t) => ({
      orden: t.orden,
      minFacturas: t.minFacturas,
      maxFacturas: t.maxFacturas,
      precio: Number(t.precio),
      etiqueta: t.etiqueta
    })),
    tramosNominas: config.tramosNominas.map((t) => ({
      orden: t.orden,
      minNominas: t.minNominas,
      maxNominas: t.maxNominas,
      precio: Number(t.precio),
      etiqueta: t.etiqueta
    })),
    tramosFacturacionAnual: config.tramosFacturacionAnual.map((t) => ({
      orden: t.orden,
      minFacturacion: Number(t.minFacturacion),
      maxFacturacion: t.maxFacturacion ? Number(t.maxFacturacion) : null,
      multiplicador: Number(t.multiplicador),
      etiqueta: t.etiqueta
    })),
    preciosModelosFiscales: config.preciosModelosFiscales.map((m) => ({
      codigoModelo: m.codigoModelo,
      nombreModelo: m.nombreModelo,
      precio: Number(m.precio),
      activo: m.activo
    })),
    preciosServiciosAdicionales: config.preciosServiciosAdicionales.map((s) => ({
      codigo: s.codigo,
      nombre: s.nombre,
      precio: Number(s.precio),
      tipoServicio: s.tipoServicio,
      activo: s.activo
    }))
  };
  cacheTimestamp2 = now;
  return configCache;
}
function getPrecioBaseFacturas(facturasMes, tramos) {
  for (const tramo of tramos) {
    const dentroDelMin = facturasMes >= tramo.minFacturas;
    const dentroDelMax = tramo.maxFacturas === null || facturasMes <= tramo.maxFacturas;
    if (dentroDelMin && dentroDelMax) {
      return tramo.precio;
    }
  }
  return tramos[tramos.length - 1]?.precio || 45;
}
function getPrecioNomina2(nominasMes, tramos) {
  for (const tramo of tramos) {
    const dentroDelMin = nominasMes >= tramo.minNominas;
    const dentroDelMax = tramo.maxNominas === null || nominasMes <= tramo.maxNominas;
    if (dentroDelMin && dentroDelMax) {
      return tramo.precio;
    }
  }
  return tramos[tramos.length - 1]?.precio || 10;
}
function getMultiplicadorFacturacion2(facturacion, tramos) {
  for (const tramo of tramos) {
    const dentroDelMin = facturacion >= tramo.minFacturacion;
    const dentroDelMax = tramo.maxFacturacion === null || facturacion <= tramo.maxFacturacion;
    if (dentroDelMin && dentroDelMax) {
      return tramo.multiplicador;
    }
  }
  return tramos[tramos.length - 1]?.multiplicador || 1;
}
function getPrecioModelo(codigo, modelos) {
  const modelo = modelos.find((m) => m.codigoModelo === codigo);
  return modelo?.precio || 0;
}
function getPrecioServicio(codigo, servicios) {
  const servicio = servicios.find((s) => s.codigo === codigo);
  return servicio?.precio || 0;
}
async function calculateAutonomo(input) {
  const items = [];
  let position = 1;
  const config = await getConfiguracion();
  const precioBase = getPrecioBaseFacturas(input.facturasMes, config.tramosFacturas);
  const tramoFacturas = config.tramosFacturas.find((t) => {
    const dentro = input.facturasMes >= t.minFacturas && (t.maxFacturas === null || input.facturasMes <= t.maxFacturas);
    return dentro;
  });
  items.push({
    concept: `Contabilidad - ${tramoFacturas?.etiqueta || `${input.facturasMes} facturas`}`,
    category: "BASE_CONTABILIDAD",
    position: position++,
    quantity: 1,
    unitPrice: precioBase,
    vatPct: 21,
    subtotal: precioBase,
    total: precioBase * 1.21
  });
  let totalContabilidad = precioBase;
  const modelosIVA = [
    { codigo: "303", nombre: "Modelo 303 - IVA Trimestral", field: "modelo303" },
    { codigo: "349", nombre: "Modelo 349 - Operaciones Intracomunitarias", field: "modelo349" },
    { codigo: "347", nombre: "Modelo 347 - Operaciones Terceras Personas", field: "modelo347" }
  ];
  modelosIVA.forEach(({ codigo, nombre, field }) => {
    if (input[field]) {
      const precio = getPrecioModelo(codigo, config.preciosModelosFiscales);
      if (precio > 0) {
        items.push({
          concept: nombre,
          category: `MODELO_${codigo}`,
          position: position++,
          quantity: 1,
          unitPrice: precio,
          vatPct: 21,
          subtotal: precio,
          total: precio * 1.21
        });
        totalContabilidad += precio;
      }
    }
  });
  const modelosIRPF = [
    { codigo: "111", nombre: "Modelo 111 - IRPF Trabajadores", field: "modelo111" },
    { codigo: "115", nombre: "Modelo 115 - IRPF Alquileres", field: "modelo115" },
    { codigo: "130", nombre: "Modelo 130 - IRPF Actividades Econ\xF3micas", field: "modelo130" },
    { codigo: "100", nombre: "Modelo 100 - Declaraci\xF3n Renta Anual", field: "modelo100" }
  ];
  modelosIRPF.forEach(({ codigo, nombre, field }) => {
    if (input[field]) {
      const precio = getPrecioModelo(codigo, config.preciosModelosFiscales);
      if (precio > 0) {
        items.push({
          concept: nombre,
          category: `MODELO_${codigo}`,
          position: position++,
          quantity: 1,
          unitPrice: precio,
          vatPct: 21,
          subtotal: precio,
          total: precio * 1.21
        });
        totalContabilidad += precio;
      }
    }
  });
  const serviciosMap = [
    { codigo: "solicitud_certificados", nombre: "Solicitud de Certificados", field: "solicitudCertificados" },
    { codigo: "censos_aeat", nombre: "Gesti\xF3n de Censos AEAT", field: "censosAEAT" },
    { codigo: "gestion_notificaciones", nombre: "Gesti\xF3n de Notificaciones", field: "recepcionNotificaciones" },
    { codigo: "estadisticas_ine", nombre: "Estad\xEDsticas INE", field: "estadisticasINE" },
    { codigo: "solicitud_ayudas", nombre: "Solicitud de Ayudas", field: "solicitudAyudas" }
  ];
  serviciosMap.forEach(({ codigo, nombre, field }) => {
    if (input[field]) {
      const precio = getPrecioServicio(codigo, config.preciosServiciosAdicionales);
      if (precio > 0) {
        items.push({
          concept: nombre,
          category: `SERVICIO_${codigo.toUpperCase()}`,
          position: position++,
          quantity: 1,
          unitPrice: precio,
          vatPct: 21,
          subtotal: precio,
          total: precio * 1.21
        });
        totalContabilidad += precio;
      }
    }
  });
  const multiplicador = getMultiplicadorFacturacion2(input.facturacion, config.tramosFacturacionAnual);
  if (multiplicador > 1) {
    const incremento = totalContabilidad * (multiplicador - 1);
    const tramoFact = config.tramosFacturacionAnual.find((t) => {
      const dentro = input.facturacion >= t.minFacturacion && (t.maxFacturacion === null || input.facturacion <= t.maxFacturacion);
      return dentro;
    });
    items.push({
      concept: `Recargo por facturaci\xF3n anual - ${tramoFact?.etiqueta || `${input.facturacion.toLocaleString()}\u20AC`} (${multiplicador.toFixed(2)}x)`,
      category: "RECARGO_FACTURACION",
      position: position++,
      quantity: 1,
      unitPrice: incremento,
      vatPct: 21,
      subtotal: incremento,
      total: incremento * 1.21
    });
    totalContabilidad += incremento;
  }
  let totalLaboral = 0;
  if (input.nominasMes > 0 && input.conLaboralSocial) {
    const precioNomina = getPrecioNomina2(input.nominasMes, config.tramosNominas);
    const totalNominas = input.nominasMes * precioNomina;
    const tramoNom = config.tramosNominas.find((t) => {
      const dentro = input.nominasMes >= t.minNominas && (t.maxNominas === null || input.nominasMes <= t.maxNominas);
      return dentro;
    });
    items.push({
      concept: `Laboral/SS - ${tramoNom?.etiqueta || `${input.nominasMes} n\xF3minas`} (${input.nominasMes} x ${precioNomina.toFixed(2)}\u20AC)`,
      category: "NOMINAS",
      position: position++,
      quantity: input.nominasMes,
      unitPrice: precioNomina,
      vatPct: 21,
      subtotal: totalNominas,
      total: totalNominas * 1.21
    });
    totalLaboral = totalNominas;
  }
  if (input.periodo === "MENSUAL") {
    const ajusteMensual = totalContabilidad * (config.porcentajePeriodoMensual / 100);
    items.push({
      concept: `Recargo por liquidaciones mensuales (+${config.porcentajePeriodoMensual.toFixed(0)}%)`,
      category: "RECARGO_MENSUAL",
      position: position++,
      quantity: 1,
      unitPrice: ajusteMensual,
      vatPct: 21,
      subtotal: ajusteMensual,
      total: ajusteMensual * 1.21
    });
    totalContabilidad += ajusteMensual;
  }
  if (input.sistemaTributacion === "ESN") {
    const ajusteEDN = totalContabilidad * (config.porcentajeEDN / 100);
    items.push({
      concept: `Recargo por Estimaci\xF3n Directa Normal (+${config.porcentajeEDN.toFixed(0)}%)`,
      category: "RECARGO_EDN",
      position: position++,
      quantity: 1,
      unitPrice: ajusteEDN,
      vatPct: 21,
      subtotal: ajusteEDN,
      total: ajusteEDN * 1.21
    });
    totalContabilidad += ajusteEDN;
  } else if (input.sistemaTributacion === "MODULOS") {
    const ajusteModulos = totalContabilidad * (Math.abs(config.porcentajeModulos) / 100);
    items.push({
      concept: `Descuento por R\xE9gimen de M\xF3dulos (${config.porcentajeModulos.toFixed(0)}%)`,
      category: "DESCUENTO_MODULOS",
      position: position++,
      quantity: 1,
      unitPrice: -ajusteModulos,
      vatPct: 21,
      subtotal: -ajusteModulos,
      total: -ajusteModulos * 1.21
    });
    totalContabilidad -= ajusteModulos;
  }
  let totalServiciosMensuales = 0;
  const serviciosMensuales = config.preciosServiciosAdicionales.filter(
    (s) => s.tipoServicio === "MENSUAL" && s.activo
  );
  let totalBase = totalContabilidad + totalLaboral + totalServiciosMensuales;
  if (input.aplicaDescuento && input.valorDescuento) {
    const tipoDescuento = input.tipoDescuento || "PORCENTAJE";
    let descuento = 0;
    if (tipoDescuento === "PORCENTAJE") {
      descuento = totalBase * (input.valorDescuento / 100);
      items.push({
        concept: `Descuento aplicado (-${input.valorDescuento}%)`,
        category: "DESCUENTO",
        position: position++,
        quantity: 1,
        unitPrice: -descuento,
        vatPct: 21,
        subtotal: -descuento,
        total: -descuento * 1.21
      });
    } else {
      descuento = input.valorDescuento;
      items.push({
        concept: `Descuento aplicado (-${descuento.toFixed(2)}\u20AC)`,
        category: "DESCUENTO",
        position: position++,
        quantity: 1,
        unitPrice: -descuento,
        vatPct: 21,
        subtotal: -descuento,
        total: -descuento * 1.21
      });
    }
    totalBase -= descuento;
  }
  if (totalBase < 0) {
    totalBase = 0;
  }
  if (input.periodo === "MENSUAL" && totalBase < config.minimoMensual) {
    const ajusteMinimo = config.minimoMensual - totalBase;
    items.push({
      concept: `Ajuste m\xEDnimo mensual (${config.minimoMensual.toFixed(2)}\u20AC)`,
      category: "MINIMO_MENSUAL",
      position: position++,
      quantity: 1,
      unitPrice: ajusteMinimo,
      vatPct: 21,
      subtotal: ajusteMinimo,
      total: ajusteMinimo * 1.21
    });
    totalBase = config.minimoMensual;
  }
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const vatTotal = items.reduce((sum, item) => sum + item.subtotal * (item.vatPct / 100), 0);
  const total = subtotal + vatTotal;
  return {
    items,
    subtotal: Math.round(subtotal * 100) / 100,
    vatTotal: Math.round(vatTotal * 100) / 100,
    total: Math.round(total * 100) / 100
  };
}
function clearConfigCache() {
  configCache = null;
  cacheTimestamp2 = 0;
}
async function getConfiguracionActual() {
  return await getConfiguracion();
}
var configCache, cacheTimestamp2, CACHE_DURATION2;
var init_calculateAutonomo = __esm({
  "server/services/budgets/calculateAutonomo.ts"() {
    init_prisma_client();
    configCache = null;
    cacheTimestamp2 = 0;
    CACHE_DURATION2 = 5 * 60 * 1e3;
  }
});

// server/services/git-update.service.ts
var git_update_service_exports = {};
__export(git_update_service_exports, {
  checkForUpdates: () => checkForUpdates,
  executeGitUpdate: () => executeGitUpdate
});
import { PrismaClient as PrismaClient13 } from "@prisma/client";
import { exec } from "child_process";
import { promisify } from "util";
async function executeGitUpdate(updateId) {
  let logs = "";
  const addLog = (message) => {
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    logs += `[${timestamp}] ${message}
`;
    console.log(message);
  };
  try {
    addLog("=== INICIO DE ACTUALIZACI\xD3N DESDE GITHUB ===");
    const update = await prisma13.system_updates.findUnique({
      where: { id: updateId }
    });
    if (!update) {
      throw new Error(`Update ${updateId} not found`);
    }
    if (!update.commit_hash) {
      throw new Error("Update does not have a commit hash");
    }
    addLog(`Commit: ${update.commit_hash.substring(0, 7)}`);
    addLog(`Mensaje: ${update.commit_message}`);
    addLog(`Autor: ${update.commit_author}`);
    addLog("");
    await prisma13.system_updates.update({
      where: { id: updateId },
      data: {
        status: "APPLYING",
        logs
      }
    });
    addLog("\u{1F4E1} Obteniendo cambios desde GitHub...");
    try {
      const fetchResult = await execAsync("git fetch origin", { cwd: PROJECT_PATH });
      if (fetchResult.stdout) addLog(fetchResult.stdout.trim());
      if (fetchResult.stderr) addLog(fetchResult.stderr.trim());
      addLog("\u2705 Fetch completado");
    } catch (error) {
      addLog(`\u274C Error en git fetch: ${error.message}`);
      throw error;
    }
    addLog("");
    addLog(`\u{1F50D} Verificando commit ${update.commit_hash.substring(0, 7)}...`);
    try {
      await execAsync(`git cat-file -t ${update.commit_hash}`, { cwd: PROJECT_PATH });
      addLog("\u2705 Commit encontrado");
    } catch (error) {
      addLog(`\u274C Commit no encontrado: ${error.message}`);
      throw new Error("Commit not found in repository");
    }
    addLog("");
    addLog("\u{1F4BE} Obteniendo commit actual...");
    let previousCommit = "";
    try {
      const { stdout } = await execAsync("git rev-parse HEAD", { cwd: PROJECT_PATH });
      previousCommit = stdout.trim();
      addLog(`Commit actual: ${previousCommit.substring(0, 7)}`);
    } catch (error) {
      addLog(`\u26A0\uFE0F  No se pudo obtener commit actual: ${error.message}`);
    }
    addLog("");
    addLog(`\u{1F504} Aplicando commit ${update.commit_hash.substring(0, 7)}...`);
    try {
      const branch = update.branch || "main";
      const { stdout: currentBranch } = await execAsync("git rev-parse --abbrev-ref HEAD", { cwd: PROJECT_PATH });
      if (currentBranch.trim() === branch) {
        const pullResult = await execAsync(`git pull origin ${branch}`, { cwd: PROJECT_PATH });
        if (pullResult.stdout) addLog(pullResult.stdout.trim());
        if (pullResult.stderr) addLog(pullResult.stderr.trim());
      } else {
        await execAsync(`git checkout ${branch}`, { cwd: PROJECT_PATH });
        const pullResult = await execAsync(`git pull origin ${branch}`, { cwd: PROJECT_PATH });
        if (pullResult.stdout) addLog(pullResult.stdout.trim());
        if (pullResult.stderr) addLog(pullResult.stderr.trim());
      }
      addLog("\u2705 C\xF3digo actualizado");
    } catch (error) {
      addLog(`\u274C Error en git pull: ${error.message}`);
      throw error;
    }
    addLog("");
    addLog("\u{1F4E6} Instalando dependencias...");
    try {
      const installResult = await execAsync("npm install", {
        cwd: PROJECT_PATH,
        env: { ...process.env, NODE_ENV: "production" }
      });
      if (installResult.stdout) addLog(installResult.stdout.split("\n").slice(-5).join("\n"));
      if (installResult.stderr) addLog(installResult.stderr.split("\n").slice(-5).join("\n"));
      addLog("\u2705 Dependencias instaladas");
    } catch (error) {
      addLog(`\u274C Error instalando dependencias: ${error.message}`);
      throw error;
    }
    addLog("");
    addLog("\u{1F528} Compilando proyecto...");
    try {
      const buildResult = await execAsync("npm run build", {
        cwd: PROJECT_PATH,
        env: { ...process.env, NODE_ENV: "production" }
      });
      if (buildResult.stdout) addLog(buildResult.stdout.split("\n").slice(-10).join("\n"));
      if (buildResult.stderr) addLog(buildResult.stderr.split("\n").slice(-10).join("\n"));
      addLog("\u2705 Build completado");
    } catch (error) {
      addLog(`\u274C Error en build: ${error.message}`);
      throw error;
    }
    addLog("");
    addLog("\u{1F504} Reiniciando servicio systemd...");
    try {
      const restartResult = await execAsync(`sudo systemctl restart ${SYSTEMD_SERVICE}`);
      if (restartResult.stdout) addLog(restartResult.stdout.trim());
      if (restartResult.stderr) addLog(restartResult.stderr.trim());
      addLog("\u2705 Servicio reiniciado");
    } catch (error) {
      addLog(`\u274C Error reiniciando servicio: ${error.message}`);
      throw error;
    }
    addLog("");
    addLog("\u{1F50D} Verificando estado del servicio...");
    try {
      const statusResult = await execAsync(`sudo systemctl status ${SYSTEMD_SERVICE}`);
      const isActive = statusResult.stdout.includes("active (running)");
      if (isActive) {
        addLog("\u2705 Servicio funcionando correctamente");
      } else {
        addLog("\u26A0\uFE0F  El servicio no est\xE1 activo");
      }
    } catch (error) {
      if (error.stdout && error.stdout.includes("active (running)")) {
        addLog("\u2705 Servicio funcionando correctamente");
      } else {
        addLog(`\u26A0\uFE0F  No se pudo verificar estado: ${error.message}`);
      }
    }
    addLog("");
    addLog("=== ACTUALIZACI\xD3N COMPLETADA EXITOSAMENTE ===");
    await prisma13.system_updates.update({
      where: { id: updateId },
      data: {
        status: "COMPLETED",
        completed_at: /* @__PURE__ */ new Date(),
        logs,
        error_message: null
      }
    });
    const config = await prisma13.system_update_config.findFirst();
    if (config) {
      await prisma13.system_update_config.update({
        where: { id: config.id },
        data: {
          currentCommitHash: update.commit_hash,
          lastCheckedAt: /* @__PURE__ */ new Date()
        }
      });
    }
  } catch (error) {
    const errorMessage = error.message || "Unknown error";
    addLog("");
    addLog("=== ERROR EN LA ACTUALIZACI\xD3N ===");
    addLog(`\u274C ${errorMessage}`);
    if (error.stack) {
      addLog("Stack trace:");
      addLog(error.stack);
    }
    await prisma13.system_updates.update({
      where: { id: updateId },
      data: {
        status: "FAILED",
        completed_at: /* @__PURE__ */ new Date(),
        logs,
        error_message: errorMessage
      }
    });
    throw error;
  }
}
async function checkForUpdates() {
  try {
    const config = await prisma13.system_update_config.findFirst();
    if (!config || !config.githubRepo) {
      console.log("No GitHub config found");
      return;
    }
    console.log(`Checking for updates in ${config.githubRepo}...`);
    const { stdout: currentCommit } = await execAsync("git rev-parse HEAD", { cwd: PROJECT_PATH });
    const currentHash = currentCommit.trim();
    await execAsync("git fetch origin", { cwd: PROJECT_PATH });
    const branch = config.githubBranch || "main";
    const { stdout: remoteCommit } = await execAsync(`git rev-parse origin/${branch}`, { cwd: PROJECT_PATH });
    const remoteHash = remoteCommit.trim();
    if (currentHash === remoteHash) {
      console.log("Already up to date");
      return;
    }
    console.log(`New commit available: ${remoteHash.substring(0, 7)}`);
    const { stdout: commitInfo } = await execAsync(
      `git log ${remoteHash} -1 --pretty=format:"%an|%aI|%s"`,
      { cwd: PROJECT_PATH }
    );
    const [author, date, message] = commitInfo.split("|");
    const existingUpdate = await prisma13.system_updates.findFirst({
      where: { commit_hash: remoteHash }
    });
    if (!existingUpdate) {
      const { v4: uuidv42 } = __require("uuid");
      await prisma13.system_updates.create({
        data: {
          id: uuidv42(),
          update_type: "GITHUB",
          commit_hash: remoteHash,
          commit_message: message,
          commit_author: author,
          commit_date: new Date(date),
          branch,
          status: "PENDING",
          logs: "Update detected manually\n"
        }
      });
      console.log("Update record created");
    }
  } catch (error) {
    console.error("Error checking for updates:", error.message);
    throw error;
  }
}
var execAsync, prisma13, PROJECT_PATH, SYSTEMD_SERVICE;
var init_git_update_service = __esm({
  "server/services/git-update.service.ts"() {
    execAsync = promisify(exec);
    prisma13 = new PrismaClient13();
    PROJECT_PATH = "/root/www/Asesoria-la-Llave-V2";
    SYSTEMD_SERVICE = "asesoria-llave.service";
  }
});

// server/services/reports-service.ts
var reports_service_exports = {};
__export(reports_service_exports, {
  getExceptions: () => getExceptions,
  getFilings: () => getFilings,
  getPredictions: () => getPredictions,
  getProductivityAnalysis: () => getProductivityAnalysis,
  getReportsKpis: () => getReportsKpis,
  getSummaryByAssignee: () => getSummaryByAssignee,
  getSummaryByClient: () => getSummaryByClient,
  getSummaryByModel: () => getSummaryByModel,
  getTemporalPerformance: () => getTemporalPerformance,
  getTrends: () => getTrends,
  getYearComparison: () => getYearComparison
});
function mapStatus(input) {
  if (!input) return void 0;
  const s = String(input).toUpperCase();
  if (s === "PENDIENTE" || s === "NOT_STARTED") return FilingStatus2.NOT_STARTED;
  if (s === "CALCULADO" || s === "IN_PROGRESS") return FilingStatus2.IN_PROGRESS;
  if (s === "PRESENTADO" || s === "PRESENTED") return FilingStatus2.PRESENTED;
  return void 0;
}
function buildWhere(filters) {
  const where = {};
  if (filters.periodId) where.periodId = filters.periodId;
  const m = mapStatus(filters.status);
  if (m) where.status = m;
  if (filters.model) where.taxModelCode = filters.model.toUpperCase();
  if (filters.clientId) where.clientId = filters.clientId;
  if (filters.assigneeId) where.assigneeId = filters.assigneeId;
  if (filters.year) {
    where.fiscal_periods = {
      ...where.fiscal_periods || {},
      year: filters.year
    };
  }
  return where;
}
async function getReportsKpis(filters) {
  const where = buildWhere(filters);
  let rows = await prisma_client_default.client_tax_filings.findMany({
    where,
    select: {
      status: true,
      presentedAt: true,
      fiscal_periods: { select: { ends_at: true, starts_at: true, year: true } }
    }
  });
  if (rows.length === 0 && filters.year) {
    const whereWithoutYear = { ...where };
    delete whereWithoutYear.fiscal_periods;
    const allRows = await prisma_client_default.client_tax_filings.findMany({
      where: whereWithoutYear,
      select: {
        status: true,
        presentedAt: true,
        fiscal_periods: { select: { ends_at: true, starts_at: true, year: true } }
      }
    });
    if (allRows.length > 0) {
      rows = allRows;
    }
  }
  let pending = 0;
  let inProgress = 0;
  let presented = 0;
  let dueIn3 = 0;
  let dueIn7 = 0;
  let overdue = 0;
  let ltSum = 0;
  let ltCount = 0;
  let lateFilings = 0;
  let onTimeFilings = 0;
  let processingTimeSum = 0;
  let processingTimeCount = 0;
  let urgentCount = 0;
  const now = Date.now();
  const dayMs = 1e3 * 60 * 60 * 24;
  for (const r of rows) {
    if (r.status === FilingStatus2.NOT_STARTED) pending += 1;
    else if (r.status === FilingStatus2.IN_PROGRESS) inProgress += 1;
    else presented += 1;
    const periodStart = r.fiscal_periods?.starts_at?.getTime();
    const periodEnd = r.fiscal_periods?.ends_at?.getTime();
    const createdAt = r.fiscal_periods?.starts_at?.getTime();
    if (r.presentedAt && periodStart) {
      const end = r.presentedAt.getTime();
      const start = periodStart;
      const days = Math.max(0, Math.round((end - start) / dayMs));
      ltSum += days;
      ltCount += 1;
      if (periodEnd && end > periodEnd) {
        lateFilings += 1;
      } else if (periodEnd) {
        onTimeFilings += 1;
      }
    }
    if (r.presentedAt && createdAt) {
      const procDays = Math.max(0, Math.round((r.presentedAt.getTime() - createdAt) / dayMs));
      processingTimeSum += procDays;
      processingTimeCount += 1;
    }
    if (periodEnd && r.status !== FilingStatus2.PRESENTED) {
      const diffDays = Math.ceil((periodEnd - now) / dayMs);
      if (diffDays <= 3) {
        dueIn3 += 1;
        urgentCount += 1;
      }
      if (diffDays <= 7) dueIn7 += 1;
      if (diffDays < 0) overdue += 1;
    }
  }
  const total = pending + inProgress + presented;
  const advancePct = total ? Math.round(presented / total * 1e3) / 10 : 0;
  const leadTimeAvg = ltCount ? Math.round(ltSum / ltCount * 10) / 10 : 0;
  const processingTimeAvg = processingTimeCount ? Math.round(processingTimeSum / processingTimeCount * 10) / 10 : 0;
  const onTimePct = lateFilings + onTimeFilings ? Math.round(onTimeFilings / (lateFilings + onTimeFilings) * 1e3) / 10 : 100;
  const efficiencyScore = total ? Math.round((presented - lateFilings) / total * 1e3) / 10 : 0;
  const workload = pending + inProgress;
  const completionRate = total ? Math.round(presented / total * 1e3) / 10 : 0;
  return {
    // Métricas básicas
    pending,
    inProgress,
    presented,
    total,
    advancePct,
    // Tiempos
    leadTimeAvg,
    processingTimeAvg,
    // Alertas
    dueIn3,
    dueIn7,
    overdue,
    urgentCount,
    // Cumplimiento
    lateFilings,
    onTimeFilings,
    onTimePct,
    // Eficiencia
    efficiencyScore,
    workload,
    completionRate
  };
}
async function getSummaryByModel(filters) {
  const where = buildWhere(filters);
  const rows = await prisma_client_default.client_tax_filings.findMany({
    where,
    select: {
      status: true,
      taxModelCode: true,
      presentedAt: true,
      fiscal_periods: { select: { starts_at: true, ends_at: true } }
    }
  });
  const map = /* @__PURE__ */ new Map();
  for (const r of rows) {
    const key = r.taxModelCode;
    if (!map.has(key)) {
      map.set(key, {
        modelCode: key,
        total: 0,
        pending: 0,
        inProgress: 0,
        presented: 0,
        overdue: 0,
        leadTimeSum: 0,
        leadTimeCount: 0
      });
    }
    const m = map.get(key);
    m.total += 1;
    if (r.status === FilingStatus2.NOT_STARTED) m.pending += 1;
    else if (r.status === FilingStatus2.IN_PROGRESS) m.inProgress += 1;
    else m.presented += 1;
    const periodStart = r.fiscal_periods?.starts_at?.getTime();
    const periodEnd = r.fiscal_periods?.ends_at?.getTime();
    if (periodEnd && r.status !== FilingStatus2.PRESENTED) {
      const diffDays = Math.ceil((periodEnd - Date.now()) / (1e3 * 60 * 60 * 24));
      if (diffDays < 0) m.overdue += 1;
    }
    if (r.presentedAt && periodStart) {
      const end = r.presentedAt.getTime();
      const start = periodStart;
      const days = Math.max(0, Math.round((end - start) / (1e3 * 60 * 60 * 24)));
      m.leadTimeSum += days;
      m.leadTimeCount += 1;
    }
  }
  return Array.from(map.values()).map((m) => ({
    modelCode: m.modelCode,
    total: m.total,
    pending: m.pending,
    inProgress: m.inProgress,
    presented: m.presented,
    advancePct: m.total ? Math.round(m.presented / m.total * 1e3) / 10 : 0,
    overdue: m.overdue,
    leadTimeAvg: m.leadTimeCount ? Math.round(m.leadTimeSum / m.leadTimeCount * 10) / 10 : 0
  })).sort((a, b) => a.modelCode.localeCompare(b.modelCode));
}
async function getSummaryByAssignee(filters) {
  const where = buildWhere(filters);
  const rows = await prisma_client_default.client_tax_filings.findMany({
    where,
    select: {
      status: true,
      assigneeId: true,
      users: { select: { username: true } },
      fiscal_periods: { select: { ends_at: true } }
    }
  });
  const map = /* @__PURE__ */ new Map();
  for (const r of rows) {
    const id = r.assigneeId ?? "sin-gestor";
    if (!map.has(id)) {
      map.set(id, {
        assigneeId: r.assigneeId ?? null,
        assigneeName: r.users?.username ?? "Sin asignar",
        assigned: 0,
        pending: 0,
        inProgress: 0,
        presented: 0,
        overdue: 0
      });
    }
    const m = map.get(id);
    m.assigned += 1;
    if (r.status === FilingStatus2.NOT_STARTED) m.pending += 1;
    else if (r.status === FilingStatus2.IN_PROGRESS) m.inProgress += 1;
    else m.presented += 1;
    const due = r.fiscal_periods?.ends_at?.getTime();
    if (due && r.status !== FilingStatus2.PRESENTED && due < Date.now()) {
      m.overdue += 1;
    }
  }
  return Array.from(map.values()).map((m) => ({
    ...m,
    advancePct: m.assigned ? Math.round(m.presented / m.assigned * 1e3) / 10 : 0,
    onTrack: m.assigned ? (m.assigned - m.overdue) / m.assigned * 100 : 0
  }));
}
async function getSummaryByClient(filters) {
  const where = buildWhere(filters);
  const rows = await prisma_client_default.client_tax_filings.findMany({
    where,
    select: {
      status: true,
      clientId: true,
      clients: { select: { razonSocial: true } },
      taxModelCode: true,
      fiscal_periods: { select: { ends_at: true } }
    }
  });
  const map = /* @__PURE__ */ new Map();
  for (const r of rows) {
    const id = r.clientId;
    if (!map.has(id)) {
      map.set(id, {
        clientId: id,
        clientName: r.clients?.razonSocial ?? "",
        models: /* @__PURE__ */ new Set(),
        pending: 0,
        inProgress: 0,
        presented: 0,
        overdue: 0
      });
    }
    const m = map.get(id);
    m.models.add(r.taxModelCode);
    if (r.status === FilingStatus2.NOT_STARTED) m.pending += 1;
    else if (r.status === FilingStatus2.IN_PROGRESS) m.inProgress += 1;
    else m.presented += 1;
    const due = r.fiscal_periods?.ends_at?.getTime();
    if (due && r.status !== FilingStatus2.PRESENTED && due < Date.now()) {
      m.overdue += 1;
    }
  }
  return Array.from(map.values()).map((m) => ({
    clientId: m.clientId,
    clientName: m.clientName,
    modelsActive: m.models.size,
    pending: m.pending,
    inProgress: m.inProgress,
    presented: m.presented,
    overdue: m.overdue,
    advancePct: m.models.size ? Math.round(m.presented / (m.pending + m.inProgress + m.presented || 1) * 1e3) / 10 : 0
  }));
}
async function getTrends(filters) {
  const where = buildWhere(filters);
  const rows = await prisma_client_default.client_tax_filings.findMany({
    where,
    select: {
      presentedAt: true,
      fiscal_periods: { select: { starts_at: true } }
    }
  });
  const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const map = /* @__PURE__ */ new Map();
  for (const r of rows) {
    if (!r.presentedAt) continue;
    const key = fmt(r.presentedAt);
    if (!map.has(key)) map.set(key, { presented: 0, ltSum: 0, ltCount: 0 });
    const m = map.get(key);
    m.presented += 1;
    const start = r.fiscal_periods?.starts_at ? r.fiscal_periods.starts_at.getTime() : void 0;
    const end = r.presentedAt.getTime();
    if (!start) continue;
    m.ltSum += Math.max(0, Math.round((end - start) / (1e3 * 60 * 60 * 24)));
    m.ltCount += 1;
  }
  const series = Array.from(map.entries()).sort((a, b) => a[0] < b[0] ? -1 : 1).map(([x, m]) => ({
    x,
    presented: m.presented,
    leadTimeAvg: m.ltCount ? Math.round(m.ltSum / m.ltCount * 10) / 10 : 0
  }));
  return { series };
}
async function getExceptions(filters) {
  const where = buildWhere(filters);
  const rows = await prisma_client_default.client_tax_filings.findMany({
    where,
    select: {
      clientId: true,
      taxModelCode: true,
      periodId: true,
      status: true,
      presentedAt: true,
      fiscal_periods: { select: { ends_at: true, label: true, year: true } },
      clients: { select: { razonSocial: true } }
    }
  });
  const key = (r) => `${r.clientId}:${r.taxModelCode}:${r.periodId}`;
  const countMap = /* @__PURE__ */ new Map();
  const latePresented = [];
  const overdueFilings = [];
  for (const r of rows) {
    const k = key(r);
    countMap.set(k, (countMap.get(k) || 0) + 1);
    const dueDate = r.fiscal_periods?.ends_at;
    if (r.presentedAt && dueDate && r.presentedAt > dueDate) {
      latePresented.push({
        clientId: r.clientId,
        clientName: r.clients?.razonSocial ?? "",
        taxModelCode: r.taxModelCode,
        periodId: r.periodId,
        dueDate,
        presentedAt: r.presentedAt
      });
    } else if (dueDate && r.status !== FilingStatus2.PRESENTED && dueDate < /* @__PURE__ */ new Date()) {
      overdueFilings.push({
        clientId: r.clientId,
        clientName: r.clients?.razonSocial ?? "",
        taxModelCode: r.taxModelCode,
        periodId: r.periodId,
        dueDate
      });
    }
  }
  const duplicateFilings = [];
  for (const [k, c] of countMap.entries()) {
    if (c > 1) duplicateFilings.push({ key: k, count: c });
  }
  return { duplicateFilings, latePresented, overdueFilings };
}
async function getFilings(filters) {
  const where = buildWhere(filters);
  const page = Number(filters.page || 1);
  const size = Math.min(500, Number(filters.size || 50));
  const skip = (page - 1) * size;
  const [total, items] = await Promise.all([
    prisma_client_default.client_tax_filings.count({ where }),
    prisma_client_default.client_tax_filings.findMany({
      where,
      include: {
        clients: { select: { razonSocial: true } },
        fiscal_periods: true,
        users: { select: { username: true } }
      },
      orderBy: [{ fiscal_periods: { starts_at: "desc" } }],
      skip,
      take: size
    })
  ]);
  const mapped = items.map((f) => {
    const dueDate = f.fiscal_periods?.ends_at ?? null;
    const daysRemaining = dueDate ? Math.ceil((dueDate.getTime() - Date.now()) / (1e3 * 60 * 60 * 24)) : null;
    const isOverdue = typeof daysRemaining === "number" ? daysRemaining < 0 && f.status !== FilingStatus2.PRESENTED : false;
    return {
      id: f.id,
      modelCode: f.taxModelCode,
      periodId: f.periodId,
      periodLabel: f.fiscal_periods ? f.fiscal_periods.quarter ? `${f.fiscal_periods.quarter}T/${f.fiscal_periods.year}` : `${f.fiscal_periods.label ?? ""} ${f.fiscal_periods.year}` : "",
      gestor: f.users?.username ?? "",
      cliente: f.clients?.razonSocial ?? "",
      status: f.status,
      presentedAt: f.presentedAt,
      dueDate,
      daysRemaining,
      isOverdue,
      cycleDays: f.presentedAt && f.fiscal_periods?.starts_at ? Math.max(
        0,
        Math.round(
          (f.presentedAt.getTime() - f.fiscal_periods.starts_at.getTime()) / (1e3 * 60 * 60 * 24)
        )
      ) : null
    };
  });
  return { items: mapped, total };
}
async function getYearComparison(year1, year2, filters) {
  const [data1, data2] = await Promise.all([
    getReportsKpis({ ...filters, year: year1 }),
    getReportsKpis({ ...filters, year: year2 })
  ]);
  return {
    year1: { year: year1, ...data1 },
    year2: { year: year2, ...data2 },
    comparison: {
      totalChange: data2.total - data1.total,
      totalChangePct: data1.total ? Math.round((data2.total - data1.total) / data1.total * 1e3) / 10 : 0,
      presentedChange: data2.presented - data1.presented,
      presentedChangePct: data1.presented ? Math.round((data2.presented - data1.presented) / data1.presented * 1e3) / 10 : 0,
      efficiencyChange: data2.efficiencyScore - data1.efficiencyScore,
      leadTimeChange: data2.leadTimeAvg - data1.leadTimeAvg,
      onTimeChange: data2.onTimePct - data1.onTimePct
    }
  };
}
async function getProductivityAnalysis(filters) {
  const where = buildWhere(filters);
  const rows = await prisma_client_default.client_tax_filings.findMany({
    where,
    select: {
      status: true,
      assigneeId: true,
      presentedAt: true,
      users: { select: { username: true } },
      fiscal_periods: { select: { starts_at: true, ends_at: true } }
    }
  });
  const gestorMap = /* @__PURE__ */ new Map();
  const dayMs = 1e3 * 60 * 60 * 24;
  const now = Date.now();
  for (const r of rows) {
    const id = r.assigneeId ?? "sin-asignar";
    if (!gestorMap.has(id)) {
      gestorMap.set(id, {
        gestorId: r.assigneeId,
        gestorName: r.users?.username ?? "Sin asignar",
        total: 0,
        completed: 0,
        pending: 0,
        inProgress: 0,
        overdue: 0,
        onTime: 0,
        late: 0,
        avgProcessingTime: 0,
        avgLeadTime: 0,
        procTimeSum: 0,
        procTimeCount: 0,
        leadTimeSum: 0,
        leadTimeCount: 0,
        workloadScore: 0,
        efficiencyScore: 0
      });
    }
    const g = gestorMap.get(id);
    g.total += 1;
    if (r.status === FilingStatus2.PRESENTED) g.completed += 1;
    else if (r.status === FilingStatus2.IN_PROGRESS) g.inProgress += 1;
    else g.pending += 1;
    const createdAt = r.fiscal_periods?.starts_at?.getTime();
    if (r.presentedAt && createdAt) {
      const procDays = Math.round((r.presentedAt.getTime() - createdAt) / dayMs);
      g.procTimeSum += procDays;
      g.procTimeCount += 1;
    }
    const periodStart = r.fiscal_periods?.starts_at?.getTime();
    const periodEnd = r.fiscal_periods?.ends_at?.getTime();
    if (r.presentedAt && periodStart) {
      const leadDays = Math.round((r.presentedAt.getTime() - periodStart) / dayMs);
      g.leadTimeSum += leadDays;
      g.leadTimeCount += 1;
      if (periodEnd && r.presentedAt.getTime() <= periodEnd) {
        g.onTime += 1;
      } else if (periodEnd) {
        g.late += 1;
      }
    }
    if (periodEnd && r.status !== FilingStatus2.PRESENTED && periodEnd < now) {
      g.overdue += 1;
    }
  }
  return Array.from(gestorMap.values()).map((g) => {
    const completionRate = g.total ? g.completed / g.total * 100 : 0;
    const onTimeRate = g.onTime + g.late ? g.onTime / (g.onTime + g.late) * 100 : 100;
    g.avgProcessingTime = g.procTimeCount ? Math.round(g.procTimeSum / g.procTimeCount * 10) / 10 : 0;
    g.avgLeadTime = g.leadTimeCount ? Math.round(g.leadTimeSum / g.leadTimeCount * 10) / 10 : 0;
    g.efficiencyScore = Math.round((completionRate * 0.4 + onTimeRate * 0.4 + (100 - Math.min(g.avgProcessingTime * 2, 100)) * 0.2) * 10) / 10;
    g.workloadScore = g.pending + g.inProgress + g.overdue;
    return {
      gestorId: g.gestorId,
      gestorName: g.gestorName,
      total: g.total,
      completed: g.completed,
      pending: g.pending,
      inProgress: g.inProgress,
      overdue: g.overdue,
      onTime: g.onTime,
      late: g.late,
      completionRate: Math.round(completionRate * 10) / 10,
      onTimeRate: Math.round(onTimeRate * 10) / 10,
      avgProcessingTime: g.avgProcessingTime,
      avgLeadTime: g.avgLeadTime,
      efficiencyScore: g.efficiencyScore,
      workloadScore: g.workloadScore
    };
  }).sort((a, b) => b.efficiencyScore - a.efficiencyScore);
}
async function getPredictions(filters) {
  const where = buildWhere(filters);
  const rows = await prisma_client_default.client_tax_filings.findMany({
    where: { ...where, status: { not: FilingStatus2.PRESENTED } },
    select: {
      status: true,
      fiscal_periods: { select: { ends_at: true } }
    }
  });
  const dayMs = 1e3 * 60 * 60 * 24;
  const now = Date.now();
  let atRiskCount = 0;
  let criticalCount = 0;
  const alerts = [];
  for (const r of rows) {
    const dueDate = r.fiscal_periods?.ends_at?.getTime();
    if (!dueDate) continue;
    const daysRemaining = Math.ceil((dueDate - now) / dayMs);
    const daysSinceCreated = 0;
    if (daysRemaining <= 3 && daysRemaining >= 0) {
      criticalCount += 1;
      if (r.status === FilingStatus2.NOT_STARTED) {
        alerts.push({
          type: "critical",
          message: `Declaraci\xF3n sin iniciar que vence en ${daysRemaining} d\xEDa(s)`,
          daysRemaining,
          status: r.status
        });
      }
    } else if (daysRemaining <= 7 && daysRemaining > 3) {
      atRiskCount += 1;
    }
    if (daysSinceCreated > 7 && r.status === FilingStatus2.IN_PROGRESS && daysRemaining <= 10) {
      alerts.push({
        type: "warning",
        message: `Declaraci\xF3n en progreso por ${daysSinceCreated} d\xEDas, vence en ${daysRemaining} d\xEDas`,
        daysRemaining,
        status: r.status
      });
    }
  }
  return {
    atRiskCount,
    criticalCount,
    alerts: alerts.slice(0, 10),
    riskLevel: criticalCount > 5 ? "high" : atRiskCount > 10 ? "medium" : "low"
  };
}
async function getTemporalPerformance(filters) {
  const where = buildWhere(filters);
  const rows = await prisma_client_default.client_tax_filings.findMany({
    where,
    select: {
      status: true,
      presentedAt: true,
      fiscal_periods: { select: { starts_at: true, ends_at: true } }
    }
  });
  const monthlyData = /* @__PURE__ */ new Map();
  const dayMs = 1e3 * 60 * 60 * 24;
  for (const r of rows) {
    if (!r.presentedAt) continue;
    const date = new Date(r.presentedAt);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (!monthlyData.has(monthKey)) {
      monthlyData.set(monthKey, {
        month: monthKey,
        presented: 0,
        onTime: 0,
        late: 0,
        avgLeadTime: 0,
        leadSum: 0,
        leadCount: 0
      });
    }
    const m = monthlyData.get(monthKey);
    m.presented += 1;
    const periodStart = r.fiscal_periods?.starts_at?.getTime();
    const periodEnd = r.fiscal_periods?.ends_at?.getTime();
    if (periodStart) {
      const leadDays = Math.round((r.presentedAt.getTime() - periodStart) / dayMs);
      m.leadSum += leadDays;
      m.leadCount += 1;
    }
    if (periodEnd && r.presentedAt.getTime() <= periodEnd) {
      m.onTime += 1;
    } else if (periodEnd) {
      m.late += 1;
    }
  }
  const series = Array.from(monthlyData.values()).map((m) => ({
    ...m,
    avgLeadTime: m.leadCount ? Math.round(m.leadSum / m.leadCount * 10) / 10 : 0,
    onTimeRate: m.onTime + m.late ? Math.round(m.onTime / (m.onTime + m.late) * 1e3) / 10 : 100
  })).sort((a, b) => a.month.localeCompare(b.month));
  return { series };
}
var FilingStatus2;
var init_reports_service = __esm({
  "server/services/reports-service.ts"() {
    init_prisma_client();
    FilingStatus2 = { NOT_STARTED: "NOT_STARTED", IN_PROGRESS: "IN_PROGRESS", PRESENTED: "PRESENTED" };
  }
});

// server/services/reports-export-service.ts
var reports_export_service_exports = {};
__export(reports_export_service_exports, {
  generateAdvancedExcelBuffer: () => generateAdvancedExcelBuffer,
  generateExcelReport: () => generateExcelReport
});
import ExcelJS4 from "exceljs";
async function generateExcelReport(filters) {
  const workbook = new ExcelJS4.Workbook();
  workbook.creator = "Asesor\xEDa La Llave";
  workbook.created = /* @__PURE__ */ new Date();
  const [kpis, summaryModel, summaryAssignee, filings] = await Promise.all([
    getReportsKpis(filters),
    getSummaryByModel(filters),
    getSummaryByAssignee(filters),
    getFilings({ ...filters, page: 1, size: 1e3 })
  ]);
  const summarySheet = workbook.addWorksheet("Resumen Ejecutivo", {
    properties: { tabColor: { argb: "FF4472C4" } }
  });
  summarySheet.mergeCells("A1:F1");
  const titleCell = summarySheet.getCell("A1");
  titleCell.value = `Reporte de Impuestos - A\xF1o ${filters.year ?? "Todos"}`;
  titleCell.font = { size: 18, bold: true, color: { argb: "FF4472C4" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  summarySheet.getRow(1).height = 30;
  summarySheet.mergeCells("A2:F2");
  const dateCell = summarySheet.getCell("A2");
  dateCell.value = `Generado el ${(/* @__PURE__ */ new Date()).toLocaleDateString("es-ES")} a las ${(/* @__PURE__ */ new Date()).toLocaleTimeString("es-ES")}`;
  dateCell.font = { italic: true, color: { argb: "FF7F7F7F" } };
  dateCell.alignment = { horizontal: "center" };
  summarySheet.addRow([]);
  summarySheet.addRow(["M\xC9TRICAS PRINCIPALES"]).font = { bold: true, size: 14 };
  summarySheet.addRow([]);
  const kpiData = [
    ["M\xE9trica", "Valor", "Descripci\xF3n"],
    ["Total Declaraciones", kpis.total, "Total de declaraciones en el periodo"],
    ["Presentadas", kpis.presented, "Declaraciones completadas"],
    ["En Progreso", kpis.inProgress, "Declaraciones calculadas"],
    ["Pendientes", kpis.pending, "Declaraciones sin iniciar"],
    ["% Completado", `${kpis.completionRate}%`, "Porcentaje de avance"],
    ["Score Eficiencia", `${kpis.efficiencyScore}%`, "Calidad y velocidad global"],
    ["% Cumplimiento", `${kpis.onTimePct}%`, "Declaraciones a tiempo"],
    ["Lead Time Promedio", `${kpis.leadTimeAvg} d\xEDas`, "Tiempo desde inicio hasta presentaci\xF3n"],
    ["Tiempo Procesamiento", `${kpis.processingTimeAvg} d\xEDas`, "Tiempo desde creaci\xF3n hasta presentaci\xF3n"],
    ["Atrasadas", kpis.overdue, "Declaraciones vencidas"],
    ["Vencen en \u22643 d\xEDas", kpis.dueIn3, "Urgentes"],
    ["Vencen en \u22647 d\xEDas", kpis.dueIn7, "Requieren atenci\xF3n"]
  ];
  const kpiStartRow = summarySheet.rowCount + 1;
  kpiData.forEach((row, idx) => {
    const addedRow = summarySheet.addRow(row);
    if (idx === 0) {
      addedRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
      addedRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF4472C4" }
      };
    } else {
      addedRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: idx % 2 === 0 ? "FFF2F2F2" : "FFFFFFFF" }
      };
    }
  });
  summarySheet.getColumn(1).width = 25;
  summarySheet.getColumn(2).width = 15;
  summarySheet.getColumn(3).width = 40;
  for (let i = kpiStartRow; i <= summarySheet.rowCount; i++) {
    ["A", "B", "C"].forEach((col) => {
      const cell = summarySheet.getCell(`${col}${i}`);
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" }
      };
    });
  }
  const modelSheet = workbook.addWorksheet("Por Modelo", {
    properties: { tabColor: { argb: "FF70AD47" } }
  });
  modelSheet.addRow(["RESUMEN POR MODELO AEAT"]).font = { bold: true, size: 14 };
  modelSheet.addRow([]);
  const modelHeaders = ["Modelo", "Total", "Pendientes", "Calculados", "Presentados", "% Avance", "Atrasados", "Lead Time"];
  const headerRow = modelSheet.addRow(modelHeaders);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF70AD47" }
  };
  summaryModel.forEach((model) => {
    const row = modelSheet.addRow([
      model.modelCode,
      model.total,
      model.pending,
      model.inProgress,
      model.presented,
      `${model.advancePct}%`,
      model.overdue,
      `${model.leadTimeAvg}d`
    ]);
    const advanceCell = row.getCell(6);
    if (model.advancePct >= 80) {
      advanceCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFC6EFCE" } };
    } else if (model.advancePct >= 50) {
      advanceCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFEB9C" } };
    } else {
      advanceCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFC7CE" } };
    }
  });
  modelSheet.columns.forEach((col) => col.width = 15);
  modelSheet.getColumn(1).width = 12;
  const gestorSheet = workbook.addWorksheet("Por Gestor", {
    properties: { tabColor: { argb: "FFFFC000" } }
  });
  gestorSheet.addRow(["AN\xC1LISIS DE PRODUCTIVIDAD POR GESTOR"]).font = { bold: true, size: 14 };
  gestorSheet.addRow([]);
  const gestorHeaders = ["Gestor", "Total", "Completadas", "Pendientes", "En Progreso", "% Comp.", "% A Tiempo", "Atrasadas", "Score Efic."];
  const gestorHeaderRow = gestorSheet.addRow(gestorHeaders);
  gestorHeaderRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  gestorHeaderRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFFC000" }
  };
  summaryAssignee.forEach((gestor) => {
    const row = gestorSheet.addRow([
      gestor.assigneeName,
      gestor.assigned,
      gestor.presented,
      gestor.pending,
      gestor.inProgress,
      `${gestor.advancePct}%`,
      `${gestor.onTrack}%`,
      gestor.overdue,
      `${Math.round((gestor.advancePct + gestor.onTrack) / 2)}%`
    ]);
    const scoreCell = row.getCell(9);
    const score = (gestor.advancePct + gestor.onTrack) / 2;
    if (score >= 80) {
      scoreCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFC6EFCE" } };
    } else if (score >= 60) {
      scoreCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFEB9C" } };
    } else {
      scoreCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFC7CE" } };
    }
  });
  gestorSheet.columns.forEach((col) => col.width = 15);
  gestorSheet.getColumn(1).width = 25;
  const detailSheet = workbook.addWorksheet("Detalle", {
    properties: { tabColor: { argb: "FFED7D31" } }
  });
  detailSheet.addRow(["DETALLE DE DECLARACIONES"]).font = { bold: true, size: 14 };
  detailSheet.addRow([]);
  const detailHeaders = ["Modelo", "Periodo", "Cliente", "Gestor", "Estado", "Presentada", "Vencimiento", "D\xEDas Rest.", "Ciclo"];
  const detailHeaderRow = detailSheet.addRow(detailHeaders);
  detailHeaderRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  detailHeaderRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFED7D31" }
  };
  filings.items.forEach((filing) => {
    const row = detailSheet.addRow([
      filing.modelCode,
      filing.periodLabel,
      filing.cliente,
      filing.gestor,
      filing.status,
      filing.presentedAt ? new Date(filing.presentedAt).toLocaleDateString("es-ES") : "",
      filing.dueDate ? new Date(filing.dueDate).toLocaleDateString("es-ES") : "",
      filing.daysRemaining ?? "",
      filing.cycleDays ?? ""
    ]);
    const statusCell = row.getCell(5);
    if (filing.status === "PRESENTED") {
      statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFC6EFCE" } };
    } else if (filing.status === "IN_PROGRESS") {
      statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFEB9C" } };
    } else {
      statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFC7CE" } };
    }
    if (filing.daysRemaining !== null && filing.status !== "PRESENTED") {
      const daysCell = row.getCell(8);
      if (filing.daysRemaining < 0) {
        daysCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFC7CE" } };
        daysCell.font = { bold: true, color: { argb: "FF9C0006" } };
      } else if (filing.daysRemaining <= 3) {
        daysCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFEB9C" } };
      }
    }
  });
  detailSheet.columns.forEach((col) => col.width = 15);
  detailSheet.getColumn(3).width = 30;
  detailSheet.getColumn(4).width = 20;
  modelSheet.autoFilter = {
    from: { row: 3, column: 1 },
    to: { row: modelSheet.rowCount, column: 8 }
  };
  gestorSheet.autoFilter = {
    from: { row: 3, column: 1 },
    to: { row: gestorSheet.rowCount, column: 9 }
  };
  detailSheet.autoFilter = {
    from: { row: 3, column: 1 },
    to: { row: detailSheet.rowCount, column: 9 }
  };
  return workbook;
}
async function generateAdvancedExcelBuffer(filters) {
  const workbook = await generateExcelReport(filters);
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
var init_reports_export_service = __esm({
  "server/services/reports-export-service.ts"() {
    init_reports_service();
  }
});

// server/services/goals-service.ts
var goals_service_exports = {};
__export(goals_service_exports, {
  evaluateGoals: () => evaluateGoals,
  getGoalTypeLabel: () => getGoalTypeLabel,
  getGoalTypeUnit: () => getGoalTypeUnit,
  getGoals: () => getGoals
});
function getGoals() {
  return [
    {
      id: "goal-1",
      type: "efficiency",
      period: "monthly",
      targetValue: 85,
      year: (/* @__PURE__ */ new Date()).getFullYear(),
      description: "Mantener eficiencia general sobre 85%"
    },
    {
      id: "goal-2",
      type: "onTime",
      period: "monthly",
      targetValue: 95,
      year: (/* @__PURE__ */ new Date()).getFullYear(),
      description: "Presentar 95% de declaraciones a tiempo"
    },
    {
      id: "goal-3",
      type: "leadTime",
      period: "monthly",
      targetValue: 15,
      year: (/* @__PURE__ */ new Date()).getFullYear(),
      description: "Reducir lead time promedio a 15 d\xEDas"
    }
  ];
}
function evaluateGoals(currentMetrics, goals) {
  return goals.map((goal) => {
    let currentValue = 0;
    let achieved = false;
    let progress = 0;
    switch (goal.type) {
      case "efficiency":
        currentValue = currentMetrics.efficiencyScore ?? 0;
        achieved = currentValue >= goal.targetValue;
        progress = Math.min(100, currentValue / goal.targetValue * 100);
        break;
      case "completion":
        currentValue = currentMetrics.completionRate ?? 0;
        achieved = currentValue >= goal.targetValue;
        progress = Math.min(100, currentValue / goal.targetValue * 100);
        break;
      case "onTime":
        currentValue = currentMetrics.onTimePct ?? 0;
        achieved = currentValue >= goal.targetValue;
        progress = Math.min(100, currentValue / goal.targetValue * 100);
        break;
      case "leadTime":
        currentValue = currentMetrics.leadTimeAvg ?? 0;
        achieved = currentValue <= goal.targetValue;
        progress = Math.min(100, goal.targetValue / (currentValue || 1) * 100);
        break;
      case "volume":
        currentValue = currentMetrics.presented ?? 0;
        achieved = currentValue >= goal.targetValue;
        progress = Math.min(100, currentValue / goal.targetValue * 100);
        break;
    }
    return {
      ...goal,
      currentValue: Math.round(currentValue * 10) / 10,
      achieved,
      progress: Math.round(progress),
      status: achieved ? "achieved" : progress >= 80 ? "on-track" : progress >= 50 ? "at-risk" : "off-track"
    };
  });
}
function getGoalTypeLabel(type) {
  return goalTypeLabels[type] || type;
}
function getGoalTypeUnit(type) {
  return goalTypeUnits[type] || "";
}
var goalTypeLabels, goalTypeUnits;
var init_goals_service = __esm({
  "server/services/goals-service.ts"() {
    goalTypeLabels = {
      efficiency: "Eficiencia",
      completion: "Completitud",
      onTime: "Cumplimiento",
      leadTime: "Lead Time",
      volume: "Volumen"
    };
    goalTypeUnits = {
      efficiency: "%",
      completion: "%",
      onTime: "%",
      leadTime: "d\xEDas",
      volume: "declaraciones"
    };
  }
});

// server/index.ts
import express9 from "express";

// server/routes.ts
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";

// server/prisma-storage.ts
import {
  PrismaClient
} from "@prisma/client";
import { randomUUID } from "crypto";

// server/crypto-utils.ts
import crypto from "crypto";
var ALGORITHM = "aes-256-gcm";
var IV_LENGTH = 16;
var TAG_LENGTH = 16;
var KEY_LENGTH = 32;
var cachedEncryptionKey = null;
var getEncryptionKey = () => {
  if (cachedEncryptionKey) {
    return cachedEncryptionKey;
  }
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    console.warn("\u26A0\uFE0F  ENCRYPTION_KEY no configurada, usando clave determin\xEDstica temporal (NO seguro para producci\xF3n)");
    cachedEncryptionKey = crypto.pbkdf2Sync("dev-fallback-key-not-secure", "smtp-salt-fixed", 1e5, KEY_LENGTH, "sha256");
  } else {
    cachedEncryptionKey = crypto.pbkdf2Sync(key, "smtp-salt", 1e5, KEY_LENGTH, "sha256");
  }
  return cachedEncryptionKey;
};
function encryptPassword(password) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(password, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();
  return iv.toString("hex") + authTag.toString("hex") + encrypted;
}
function decryptPassword(encryptedPassword) {
  try {
    const iv = Buffer.from(encryptedPassword.slice(0, IV_LENGTH * 2), "hex");
    const authTag = Buffer.from(encryptedPassword.slice(IV_LENGTH * 2, (IV_LENGTH + TAG_LENGTH) * 2), "hex");
    const encrypted = encryptedPassword.slice((IV_LENGTH + TAG_LENGTH) * 2);
    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    console.error("Error al desencriptar password SMTP:", error);
    throw new Error("Error al desencriptar credencial SMTP");
  }
}

// shared/tax-rules.ts
var CLIENT_TYPES = ["AUTONOMO", "EMPRESA", "PARTICULAR"];
var TAX_PERIODICITIES = ["MENSUAL", "TRIMESTRAL", "ANUAL", "ESPECIAL_FRACCIONADO"];
var TAX_RULES = {
  "100": { allowedTypes: ["AUTONOMO", "PARTICULAR"], allowedPeriods: ["ANUAL"] },
  "200": { allowedTypes: ["EMPRESA"], allowedPeriods: ["ANUAL"] },
  "202": {
    allowedTypes: ["EMPRESA"],
    allowedPeriods: ["ESPECIAL_FRACCIONADO"],
    labels: ["Abril", "Octubre", "Diciembre"]
  },
  "130": { allowedTypes: ["AUTONOMO"], allowedPeriods: ["TRIMESTRAL"] },
  "131": { allowedTypes: ["AUTONOMO"], allowedPeriods: ["TRIMESTRAL"] },
  "303": { allowedTypes: ["AUTONOMO", "EMPRESA"], allowedPeriods: ["MENSUAL", "TRIMESTRAL"] },
  "390": { allowedTypes: ["AUTONOMO", "EMPRESA"], allowedPeriods: ["ANUAL"] },
  "347": { allowedTypes: ["AUTONOMO", "EMPRESA"], allowedPeriods: ["ANUAL"] },
  "349": { allowedTypes: ["AUTONOMO", "EMPRESA"], allowedPeriods: ["MENSUAL", "TRIMESTRAL"] },
  "720": { allowedTypes: ["AUTONOMO", "EMPRESA"], allowedPeriods: ["ANUAL"] },
  "190": { allowedTypes: ["AUTONOMO", "EMPRESA"], allowedPeriods: ["ANUAL"] },
  "180": { allowedTypes: ["AUTONOMO", "EMPRESA"], allowedPeriods: ["ANUAL"] },
  "111": { allowedTypes: ["AUTONOMO", "EMPRESA"], allowedPeriods: ["MENSUAL", "TRIMESTRAL"] }
};
var TAX_MODEL_METADATA = {
  "100": { name: "IRPF - Declaraci\xF3n de la Renta" },
  "111": { name: "Retenciones - Modelo 111" },
  "130": { name: "IRPF - Pago fraccionado (actividades econ\xF3micas)" },
  "131": { name: "IRPF - Pago fraccionado (estimaci\xF3n directa)" },
  "180": { name: "Retenciones - Alquileres" },
  "190": { name: "Retenciones - Resumen anual" },
  "200": { name: "Impuesto sobre Sociedades" },
  "202": { name: "Pagos fraccionados IS" },
  "303": { name: "IVA - Autoliquidaci\xF3n" },
  "347": { name: "Operaciones con terceras personas" },
  "349": { name: "Operaciones intracomunitarias" },
  "390": { name: "IVA - Resumen anual" },
  "720": { name: "Bienes en el extranjero" }
};
var TAX_CONTROL_MODEL_ORDER = [
  "100",
  "111",
  "130",
  "131",
  "200",
  "202",
  "303",
  "347",
  "349",
  "390",
  "190",
  "180",
  "720"
];
var NORMALIZED_TAX_STATUSES = ["PENDIENTE", "CALCULADO", "PRESENTADO"];
function validateTaxAssignmentInput(options) {
  const { clientType, taxModelCode, periodicity } = options;
  const rule = TAX_RULES[taxModelCode];
  if (!rule) {
    throw new Error(`Modelo fiscal desconocido: ${taxModelCode}`);
  }
  if (!rule.allowedTypes.includes(clientType)) {
    throw new Error(
      `El modelo ${taxModelCode} no es compatible con clientes de tipo ${clientType}`
    );
  }
  if (!rule.allowedPeriods.includes(periodicity)) {
    throw new Error(
      `La periodicidad ${periodicity} no est\xE1 permitida para el modelo ${taxModelCode}`
    );
  }
}

// server/services/tax-calendar-service.ts
var STATUS_PENDING = "PENDIENTE";
var STATUS_OPEN = "ABIERTO";
var STATUS_CLOSED = "CERRADO";
var DAY_MS = 1e3 * 60 * 60 * 24;
function normalizeDate(date) {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}
function diffInDays(target, reference) {
  const ms = target.getTime() - reference.getTime();
  return Math.ceil(ms / DAY_MS);
}
function calculateTaxPeriodStatus(startDate, endDate) {
  const today2 = normalizeDate(/* @__PURE__ */ new Date());
  const start = normalizeDate(startDate);
  const end = normalizeDate(endDate);
  if (today2 < start) {
    return STATUS_PENDING;
  }
  if (today2 > end) {
    return STATUS_CLOSED;
  }
  return STATUS_OPEN;
}
function calculateDerivedFields(startDate, endDate) {
  const today2 = /* @__PURE__ */ new Date();
  const status = calculateTaxPeriodStatus(startDate, endDate);
  const isPending = status === STATUS_PENDING;
  const isOpen = status === STATUS_OPEN;
  const daysToStart = isPending ? diffInDays(startDate, today2) : null;
  const daysToEnd = isOpen ? diffInDays(endDate, today2) : null;
  return {
    status,
    daysToStart,
    daysToEnd
  };
}

// server/prisma-storage.ts
var FilingStatus = {
  NOT_STARTED: "NOT_STARTED",
  IN_PROGRESS: "IN_PROGRESS",
  PRESENTED: "PRESENTED"
};
var TaxPeriodType = {
  QUARTERLY: "QUARTERLY",
  MONTHLY: "MONTHLY",
  ANNUAL: "ANNUAL",
  SPECIAL: "SPECIAL"
};
var PeriodStatus = {
  OPEN: "OPEN",
  CLOSED: "CLOSED"
};
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not configured. Please set it in your environment variables.");
}
var prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
});
function mapPrismaUser(users) {
  return {
    id: users.id,
    username: users.username,
    email: users.email,
    password: users.password,
    role: users.role || null,
    roleId: users.roleId || null,
    isActive: users.isActive ?? true,
    createdAt: users.createdAt
  };
}
function mapJsonArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => `${item}`);
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => `${item}`);
      }
    } catch (e) {
    }
  }
  return [];
}
function mapPrismaTaxModelsConfig(config) {
  return {
    code: config.code,
    name: config.name,
    allowedTypes: mapJsonArray(config.allowedTypes),
    allowedPeriods: mapJsonArray(config.allowedPeriods),
    labels: config.labels ? mapJsonArray(config.labels) : null,
    isActive: config.isActive ?? true,
    createdAt: config.createdAt,
    updatedAt: config.updatedAt
  };
}
function getTaxModelName(code) {
  return TAX_MODEL_METADATA[code]?.name ?? `Modelo ${code}`;
}
var TAX_CONTROL_MODELS = [...TAX_CONTROL_MODEL_ORDER];
var STATUS_PRIORITY = {
  PRESENTADO: 6,
  PRESENTED: 6,
  CALCULADO: 5,
  CALCULATED: 5,
  IN_PROGRESS: 4,
  COMPLETED: 4,
  PENDIENTE: 2,
  PENDING: 2,
  NOT_STARTED: 1
};
function normalizeStatus(rawStatus, isActive) {
  if (!rawStatus) {
    return isActive ? "PENDIENTE" : null;
  }
  const upper = rawStatus.toUpperCase();
  if (upper === "NOT_STARTED") return "PENDIENTE";
  if (upper === "IN_PROGRESS") return "CALCULADO";
  if (upper === "PRESENTED") return "PRESENTADO";
  if (upper === "CALCULATED") return "CALCULADO";
  if (upper === "PENDING" || upper === "NOT_STARTED") return "PENDIENTE";
  if (NORMALIZED_TAX_STATUSES.includes(upper)) return upper;
  return upper;
}
var MONTH_LABELS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre"
];
function formatPeriodLabel(tax_periods) {
  if (!tax_periods) return null;
  const year = tax_periods.year ?? "";
  const rawLabel = (tax_periods.label ?? "").toString();
  if (tax_periods.kind === TaxPeriodType.MONTHLY || /^M\d{2}$/i.test(rawLabel) || tax_periods.kind === TaxPeriodType.SPECIAL && rawLabel.toUpperCase().startsWith("MES-")) {
    let monthIndex = null;
    if (/^M\d{2}$/i.test(rawLabel)) {
      monthIndex = parseInt(rawLabel.slice(1), 10) - 1;
    }
    if (monthIndex === null && tax_periods.starts_at) {
      try {
        monthIndex = new Date(tax_periods.starts_at).getMonth();
      } catch (e) {
        monthIndex = null;
      }
    }
    let display;
    if (monthIndex !== null && MONTH_LABELS[monthIndex]) {
      display = MONTH_LABELS[monthIndex];
    } else {
      display = rawLabel.replace(/^MES[-_]?/i, "").trim();
    }
    return `${display} ${year}`.trim();
  }
  if (tax_periods.quarter != null) {
    return `${tax_periods.quarter}T/${year}`;
  }
  if (tax_periods.label) {
    return `${tax_periods.label} ${year}`.trim();
  }
  return `${year}`;
}
function mapPrismaClient(client) {
  const taxModelsSource = client.client_tax_models || client.taxModels || [];
  const employeesSource = client.client_employees || client.employees || [];
  const taxAssignments = Array.isArray(taxModelsSource) ? taxModelsSource.map((m) => ({
    id: m.id,
    clientId: m.client_id,
    taxModelCode: m.model_number,
    periodicity: m.period_type,
    startDate: m.start_date,
    endDate: m.end_date,
    activeFlag: m.is_active,
    notes: m.notes,
    createdAt: m.created_at,
    updatedAt: m.updated_at
  })) : [];
  return {
    id: client.id,
    razonSocial: client.razonSocial,
    nifCif: client.nifCif,
    tipo: (client.tipo || "").toUpperCase(),
    email: client.email ?? null,
    telefono: client.telefono ?? null,
    direccion: client.direccion ?? null,
    fechaAlta: client.fechaAlta,
    fechaBaja: client.fechaBaja ?? null,
    responsableAsignado: client.responsableAsignado ?? null,
    taxModels: client.taxModels ?? client.tax_models ?? null,
    isActive: client.isActive ?? true,
    notes: client.notes ?? null,
    taxAssignments,
    employees: Array.isArray(employeesSource) ? employeesSource.map(mapPrismaClientEmployee) : []
  };
}
function mapPrismaClientEmployee(employee) {
  const user = employee.users || employee.user || null;
  return {
    userId: employee.userId ?? employee.user_id ?? null,
    isPrimary: employee.is_primary ?? employee.isPrimary ?? false,
    assignedAt: employee.assigned_at ?? null,
    user: user ? {
      id: user.id,
      username: user.username,
      email: user.email
    } : null
  };
}
function mapPrismaTask(task) {
  return {
    id: task.id,
    titulo: task.titulo,
    descripcion: task.descripcion,
    clienteId: task.cliente_id,
    asignadoA: task.asignadoA,
    prioridad: task.prioridad,
    estado: task.estado,
    visibilidad: task.visibilidad,
    fechaVencimiento: task.fechaVencimiento,
    fechaCreacion: task.fechaCreacion,
    fechaActualizacion: task.fechaActualizacion
  };
}
function mapPrismaManual(manual) {
  return {
    id: manual.id,
    titulo: manual.titulo,
    contenidoHtml: manual.contenido_html,
    autorId: manual.autor_id,
    etiquetas: manual.etiquetas ? JSON.parse(manual.etiquetas) : [],
    categoria: manual.categoria,
    publicado: manual.status === "PUBLISHED",
    fechaCreacion: manual.fecha_creacion,
    fechaActualizacion: manual.fecha_actualizacion
  };
}
function mapPrismaManualAttachment(attachment) {
  return {
    id: attachment.id,
    manualId: attachment.manualId,
    fileName: attachment.fileName,
    originalName: attachment.original_name,
    filePath: attachment.filePath,
    fileType: attachment.file_type,
    fileSize: attachment.fileSize,
    uploadedBy: attachment.uploaded_by,
    uploadedAt: attachment.uploaded_at
  };
}
function mapPrismaManualVersion(version) {
  return {
    id: version.id,
    manualId: version.manualId,
    versionNumber: version.versionNumber,
    titulo: version.titulo,
    contenidoHtml: version.contenido_html,
    etiquetas: version.etiquetas ? JSON.parse(version.etiquetas) : [],
    categoria: version.categoria,
    createdBy: version.createdBy,
    createdAt: version.createdAt
  };
}
function mapPrismaActivityLog(log2) {
  return {
    id: log2.id,
    usuarioId: log2.usuarioId,
    accion: log2.accion,
    modulo: log2.modulo,
    detalles: log2.detalles,
    fecha: log2.fecha
  };
}
function mapPrismaAuditTrail(audit) {
  return {
    id: audit.id,
    usuarioId: audit.usuarioId,
    accion: audit.accion,
    tabla: audit.tabla,
    registroId: audit.registroId,
    valorAnterior: audit.valorAnterior,
    valorNuevo: audit.valorNuevo,
    cambios: audit.cambios,
    fecha: audit.fecha
  };
}
var PrismaStorage = class {
  // ==================== USER METHODS ====================
  async getAllUsers() {
    const users = await prisma.users.findMany({
      include: {
        roles: {
          select: {
            id: true,
            name: true,
            description: true,
            is_system: true,
            createdAt: true,
            updatedAt: true
          }
        }
      }
    });
    return users.map(mapPrismaUser);
  }
  async getUser(id) {
    const user = await prisma.users.findUnique({ where: { id } });
    return user ? mapPrismaUser(user) : void 0;
  }
  async getUserByUsername(username) {
    const user = await prisma.users.findUnique({ where: { username } });
    return user ? mapPrismaUser(user) : void 0;
  }
  async getUserByEmail(email) {
    const user = await prisma.users.findUnique({ where: { email } });
    return user ? mapPrismaUser(user) : void 0;
  }
  async getUserWithPermissions(id) {
    const user = await prisma.users.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        is_owner: true,
        createdAt: true,
        roleId: true,
        roles: {
          select: {
            id: true,
            name: true,
            description: true,
            is_system: true,
            createdAt: true,
            updatedAt: true,
            role_permissions: {
              include: {
                permissions: true
              }
            }
          }
        }
      }
    });
    return user;
  }
  async createUser(insertUser) {
    const user = await prisma.users.create({
      data: {
        id: randomUUID(),
        username: insertUser.username,
        email: insertUser.email,
        password: insertUser.password,
        roleId: insertUser.roleId
      }
    });
    return mapPrismaUser(user);
  }
  async updateUser(id, updateData) {
    try {
      const user = await prisma.users.update({
        where: { id },
        data: updateData,
        include: {
          roles: {
            select: {
              id: true,
              name: true,
              description: true,
              is_system: true,
              createdAt: true,
              updatedAt: true
            }
          }
        }
      });
      return mapPrismaUser(user);
    } catch {
      return void 0;
    }
  }
  async deleteUser(id) {
    try {
      const existing = await prisma.users.findUnique({ where: { id }, select: { is_owner: true, username: true } });
      if (!existing) return false;
      if (existing.is_owner) {
        const err = new Error(`No se puede eliminar al usuario Owner (${existing.username}).`);
        err.code = "CANNOT_DELETE_OWNER";
        throw err;
      }
      await prisma.users.delete({ where: { id } });
      return true;
    } catch (error) {
      if (error?.code === "CANNOT_DELETE_OWNER") throw error;
      return false;
    }
  }
  // ==================== CLIENT METHODS ====================
  async getAllClients() {
    const clients = await prisma.clients.findMany({
      include: {
        client_employees: {
          include: {
            users: {
              select: {
                id: true,
                username: true,
                email: true
              }
            }
          }
        },
        client_tax_models: true
      }
    });
    return clients.map(mapPrismaClient);
  }
  async getAllClientsSummary() {
    const clients = await prisma.clients.findMany({
      select: {
        id: true,
        razonSocial: true,
        nifCif: true,
        tipo: true,
        email: true,
        telefono: true,
        direccion: true,
        fechaAlta: true,
        fechaBaja: true,
        responsableAsignado: true,
        isActive: true
      },
      orderBy: { razonSocial: "asc" }
    });
    return clients.map((c) => ({
      id: c.id,
      razonSocial: c.razonSocial,
      nifCif: c.nifCif,
      tipo: (c.tipo || "").toUpperCase(),
      email: c.email ?? null,
      telefono: c.telefono ?? null,
      direccion: c.direccion ?? null,
      fechaAlta: c.fechaAlta,
      fechaBaja: c.fechaBaja ?? null,
      responsableAsignado: c.responsableAsignado ?? null,
      isActive: c.isActive ?? true
    }));
  }
  async getClient(id) {
    const client = await prisma.clients.findUnique({
      where: { id },
      include: {
        client_employees: {
          include: {
            users: {
              select: {
                id: true,
                username: true,
                email: true
              }
            }
          }
        },
        client_tax_models: true
      }
    });
    return client ? mapPrismaClient(client) : void 0;
  }
  async getClientByNif(nifCif) {
    const client = await prisma.clients.findUnique({
      where: { nifCif },
      include: {
        client_employees: {
          include: {
            users: {
              select: {
                id: true,
                username: true,
                email: true
              }
            }
          }
        },
        client_tax_models: true
      }
    });
    return client ? mapPrismaClient(client) : void 0;
  }
  async createClient(insertClient) {
    const data = {
      id: randomUUID(),
      razonSocial: insertClient.razonSocial,
      nifCif: insertClient.nifCif,
      tipo: (insertClient.tipo || "").toUpperCase(),
      email: insertClient.email ?? null,
      telefono: insertClient.telefono ?? null,
      direccion: insertClient.direccion ?? null,
      responsableAsignado: insertClient.responsableAsignado || null,
      tax_models: insertClient.taxModels || null,
      isActive: insertClient.isActive ?? true,
      notes: insertClient.notes ?? null
    };
    if (insertClient.fechaAlta) {
      data.fechaAlta = new Date(insertClient.fechaAlta);
    }
    if (insertClient.fechaBaja !== void 0) {
      data.fechaBaja = insertClient.fechaBaja ? new Date(insertClient.fechaBaja) : null;
    }
    const client = await prisma.clients.create({
      data,
      include: {
        client_employees: {
          include: {
            users: {
              select: {
                id: true,
                username: true,
                email: true
              }
            }
          }
        },
        client_tax_models: true
      }
    });
    return mapPrismaClient(client);
  }
  async updateClient(id, updateData) {
    try {
      const data = { ...updateData };
      if (data.tipo) data.tipo = data.tipo.toUpperCase();
      if (data.taxModels !== void 0) data.taxModels = data.taxModels;
      if (data.isActive !== void 0) data.isActive = data.isActive;
      if (data.responsableAsignado === "") data.responsableAsignado = null;
      if (data.fechaAlta) data.fechaAlta = new Date(data.fechaAlta);
      if (data.fechaBaja !== void 0) {
        data.fechaBaja = data.fechaBaja ? new Date(data.fechaBaja) : null;
      }
      if (data.notes === "") data.notes = null;
      const client = await prisma.clients.update({
        where: { id },
        data,
        include: {
          client_employees: {
            include: {
              users: {
                select: {
                  id: true,
                  username: true,
                  email: true
                }
              }
            }
          },
          client_tax_models: true
        }
      });
      return mapPrismaClient(client);
    } catch {
      return void 0;
    }
  }
  async deleteClient(id) {
    try {
      await prisma.clients.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }
  async ensureTaxModelsConfigSeeded() {
    const codes = Object.keys(TAX_RULES);
    try {
      await Promise.all(
        codes.map(async (code) => {
          const rule = TAX_RULES[code];
          await prisma.tax_models_config.upsert({
            where: { code },
            create: {
              code,
              name: getTaxModelName(code),
              allowedTypes: JSON.stringify(rule.allowedTypes),
              allowedPeriods: JSON.stringify(rule.allowedPeriods),
              labels: rule.labels ? JSON.stringify(rule.labels) : void 0,
              isActive: true,
              updatedAt: /* @__PURE__ */ new Date()
            },
            update: {
              name: getTaxModelName(code),
              allowedTypes: JSON.stringify(rule.allowedTypes),
              allowedPeriods: JSON.stringify(rule.allowedPeriods),
              labels: rule.labels ? JSON.stringify(rule.labels) : void 0,
              isActive: true,
              updatedAt: /* @__PURE__ */ new Date()
            }
          });
        })
      );
    } catch (error) {
      if (error?.code === "P2021") {
        throw new Error(
          "La tabla tax_models_config no existe. Ejecuta `npx prisma db push` o `npm run prisma:push` para aplicar el esquema antes de iniciar el servidor."
        );
      }
      throw error;
    }
  }
  async getActiveTaxModelsConfig() {
    const configs = await prisma.tax_models_config.findMany({
      where: { isActive: true },
      orderBy: { code: "asc" }
    });
    return configs.map(mapPrismaTaxModelsConfig);
  }
  async getTaxModelConfig(code) {
    const config = await prisma.tax_models_config.findUnique({
      where: { code }
    });
    return config ? mapPrismaTaxModelsConfig(config) : null;
  }
  // ==================== TAX MODELS MANAGEMENT ====================
  async getAllTaxModels() {
    const models = await prisma.tax_models_config.findMany({
      orderBy: { code: "asc" }
    });
    return models.map(mapPrismaTaxModelsConfig);
  }
  async getTaxModelByCode(code) {
    const model = await prisma.tax_models_config.findUnique({
      where: { code }
    });
    return model ? mapPrismaTaxModelsConfig(model) : null;
  }
  async createTaxModel(data) {
    const model = await prisma.tax_models_config.create({
      data: {
        code: data.code,
        name: data.name,
        allowedTypes: JSON.stringify(data.allowedTypes),
        allowedPeriods: JSON.stringify(data.allowedPeriods),
        isActive: true,
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      }
    });
    return mapPrismaTaxModelsConfig(model);
  }
  async updateTaxModel(code, data) {
    const updateData = {
      updatedAt: /* @__PURE__ */ new Date()
    };
    if (data.name !== void 0) updateData.name = data.name;
    if (data.allowedTypes !== void 0) updateData.allowedTypes = JSON.stringify(data.allowedTypes);
    if (data.allowedPeriods !== void 0) updateData.allowedPeriods = JSON.stringify(data.allowedPeriods);
    if (data.isActive !== void 0) updateData.isActive = data.isActive;
    const model = await prisma.tax_models_config.update({
      where: { code },
      data: updateData
    });
    return mapPrismaTaxModelsConfig(model);
  }
  async deleteTaxModel(code) {
    await prisma.tax_models_config.delete({
      where: { code }
    });
  }
  async getAssignmentsByTaxModel(taxModelCode) {
    const models = await prisma.client_tax_models.findMany({
      where: {
        model_number: taxModelCode,
        is_active: true
      },
      include: {
        clients: {
          select: {
            id: true,
            razonSocial: true,
            nifCif: true
          }
        }
      }
    });
    return models.map((m) => ({
      id: m.id,
      clientId: m.client_id,
      taxModelCode: m.model_number,
      periodicity: this.periodTypeToSpanish(m.period_type),
      startDate: m.start_date,
      endDate: m.end_date,
      activeFlag: m.is_active,
      clients: m.clients,
      effectiveActive: m.is_active && (!m.end_date || m.end_date > /* @__PURE__ */ new Date())
    }));
  }
  periodTypeToSpanish(periodType) {
    const map = {
      "MONTHLY": "MENSUAL",
      "QUARTERLY": "TRIMESTRAL",
      "ANNUAL": "ANUAL",
      "SPECIAL": "ESPECIAL_FRACCIONADO"
    };
    return map[periodType] || periodType;
  }
  spanishToEnglish(periodicidad) {
    const map = {
      "MENSUAL": "MONTHLY",
      "TRIMESTRAL": "QUARTERLY",
      "ANUAL": "ANNUAL",
      "ESPECIAL_FRACCIONADO": "SPECIAL"
    };
    return map[periodicidad] || periodicidad;
  }
  async findClientTaxAssignmentByCode(clientId, taxModelCode) {
    const model = await prisma.client_tax_models.findFirst({
      where: {
        client_id: clientId,
        model_number: taxModelCode
      }
    });
    if (!model) return null;
    return {
      id: model.id,
      clientId: model.client_id,
      taxModelCode: model.model_number,
      periodicity: this.periodTypeToSpanish(model.period_type),
      startDate: model.start_date,
      endDate: model.end_date,
      activeFlag: model.is_active,
      notes: model.notes,
      createdAt: model.created_at,
      updatedAt: model.updated_at,
      effectiveActive: model.is_active && (!model.end_date || model.end_date > /* @__PURE__ */ new Date())
    };
  }
  async getClientTaxAssignments(clientId) {
    const models = await prisma.client_tax_models.findMany({
      where: { client_id: clientId },
      orderBy: [{ start_date: "desc" }, { model_number: "asc" }]
    });
    return models.map((m) => ({
      id: m.id,
      clientId: m.client_id,
      taxModelCode: m.model_number,
      periodicity: this.periodTypeToSpanish(m.period_type),
      startDate: m.start_date,
      endDate: m.end_date,
      activeFlag: m.is_active,
      notes: m.notes,
      createdAt: m.created_at,
      updatedAt: m.updated_at,
      effectiveActive: m.is_active && (!m.end_date || m.end_date > /* @__PURE__ */ new Date())
    }));
  }
  async getClientTaxAssignment(id) {
    const model = await prisma.client_tax_models.findUnique({
      where: { id }
    });
    if (!model) return null;
    return {
      id: model.id,
      clientId: model.client_id,
      taxModelCode: model.model_number,
      periodicity: this.periodTypeToSpanish(model.period_type),
      startDate: model.start_date,
      endDate: model.end_date,
      activeFlag: model.is_active,
      notes: model.notes,
      createdAt: model.created_at,
      updatedAt: model.updated_at,
      effectiveActive: model.is_active && (!model.end_date || model.end_date > /* @__PURE__ */ new Date())
    };
  }
  buildTaxAssignmentUpdateData(data) {
    const payload = {};
    if (data.taxModelCode !== void 0) payload.model_number = data.taxModelCode;
    if (data.periodicity !== void 0) payload.period_type = this.spanishToEnglish(data.periodicity);
    if (data.startDate !== void 0) payload.start_date = data.startDate;
    if (data.endDate !== void 0) payload.end_date = data.endDate;
    if (data.activeFlag !== void 0) payload.is_active = data.activeFlag;
    if (data.notes !== void 0) payload.notes = data.notes;
    return payload;
  }
  async createClientTaxAssignment(clientId, data) {
    const model = await prisma.client_tax_models.create({
      data: {
        id: randomUUID(),
        client_id: clientId,
        model_number: data.taxModelCode,
        period_type: this.spanishToEnglish(data.periodicity),
        start_date: data.startDate,
        end_date: data.endDate || null,
        is_active: data.activeFlag !== void 0 ? data.activeFlag : true,
        notes: data.notes || null
      }
    });
    return {
      id: model.id,
      clientId: model.client_id,
      taxModelCode: model.model_number,
      periodicity: this.periodTypeToSpanish(model.period_type),
      startDate: model.start_date,
      endDate: model.end_date,
      activeFlag: model.is_active,
      notes: model.notes,
      createdAt: model.created_at,
      updatedAt: model.updated_at,
      effectiveActive: model.is_active && (!model.end_date || model.end_date > /* @__PURE__ */ new Date())
    };
  }
  async updateClientTaxAssignment(id, data) {
    const model = await prisma.client_tax_models.update({
      where: { id },
      data: this.buildTaxAssignmentUpdateData(data)
    });
    return {
      id: model.id,
      clientId: model.client_id,
      taxModelCode: model.model_number,
      periodicity: this.periodTypeToSpanish(model.period_type),
      startDate: model.start_date,
      endDate: model.end_date,
      activeFlag: model.is_active,
      notes: model.notes,
      createdAt: model.created_at,
      updatedAt: model.updated_at,
      effectiveActive: model.is_active && (!model.end_date || model.end_date > /* @__PURE__ */ new Date())
    };
  }
  async deleteClientTaxAssignment(id) {
    const model = await prisma.client_tax_models.delete({
      where: { id }
    });
    return {
      id: model.id,
      clientId: model.client_id,
      taxModelCode: model.model_number,
      periodicity: this.periodTypeToSpanish(model.period_type),
      startDate: model.start_date,
      endDate: model.end_date,
      activeFlag: model.is_active,
      notes: model.notes,
      createdAt: model.created_at,
      updatedAt: model.updated_at,
      effectiveActive: false
    };
  }
  async softDeactivateClientTaxAssignment(id, endDate) {
    const model = await prisma.client_tax_models.update({
      where: { id },
      data: {
        end_date: endDate,
        is_active: false
      }
    });
    return {
      id: model.id,
      clientId: model.client_id,
      taxModelCode: model.model_number,
      periodicity: this.periodTypeToSpanish(model.period_type),
      startDate: model.start_date,
      endDate: model.end_date,
      activeFlag: model.is_active,
      notes: model.notes,
      createdAt: model.created_at,
      updatedAt: model.updated_at,
      effectiveActive: false
    };
  }
  async hasAssignmentHistoricFilings(clientId, taxModelCode) {
    const count = await prisma.client_tax_filings.count({
      where: {
        clientId,
        taxModelCode
      }
    });
    return count > 0;
  }
  async bulkRemoveClientTaxAssignments(clientId, options) {
    const codesFilter = (options?.codes || []).map((c) => String(c).toUpperCase());
    const whereModels = {
      client_id: clientId,
      ...codesFilter.length > 0 ? { model_number: { in: codesFilter } } : {}
    };
    const models = await prisma.client_tax_models.findMany({
      where: whereModels,
      select: { id: true, model_number: true }
    });
    if (models.length === 0) return { deleted: 0, deactivated: 0 };
    const codes = Array.from(new Set(models.map((m) => String(m.model_number))));
    const filings = await prisma.client_tax_filings.findMany({
      where: { clientId, taxModelCode: { in: codes } },
      select: { taxModelCode: true }
    });
    const codesWithHistory = new Set(filings.map((f) => String(f.taxModelCode)));
    const toDeactivate = options?.hard ? [] : codes.filter((c) => codesWithHistory.has(c));
    const toDelete = options?.hard ? codes : codes.filter((c) => !codesWithHistory.has(c));
    let deactivated = 0;
    let deleted = 0;
    await prisma.$transaction(async (tx) => {
      if (toDeactivate.length > 0) {
        const res = await tx.client_tax_models.updateMany({
          where: { client_id: clientId, model_number: { in: toDeactivate } },
          data: { end_date: /* @__PURE__ */ new Date(), is_active: false }
        });
        deactivated += res.count;
      }
      if (toDelete.length > 0) {
        if (options?.hard) {
          await tx.client_tax_filings.deleteMany({ where: { clientId, taxModelCode: { in: toDelete } } });
        }
        const res = await tx.client_tax_models.deleteMany({
          where: { client_id: clientId, model_number: { in: toDelete } }
        });
        deleted += res.count;
      }
    });
    return { deleted, deactivated };
  }
  async bulkRemoveAssignmentsByIds(clientId, assignmentIds, options) {
    if (!Array.isArray(assignmentIds) || assignmentIds.length === 0) {
      return { deleted: 0, deactivated: 0 };
    }
    const models = await prisma.client_tax_models.findMany({
      where: { id: { in: assignmentIds }, client_id: clientId },
      select: { id: true, model_number: true }
    });
    if (models.length === 0) return { deleted: 0, deactivated: 0 };
    let deleted = 0;
    let deactivated = 0;
    await prisma.$transaction(async (tx) => {
      if (options?.hard) {
        const codeSet = new Set(models.map((m) => String(m.model_number)));
        await tx.client_tax_filings.deleteMany({ where: { clientId, taxModelCode: { in: Array.from(codeSet) } } });
      }
      for (const m of models) {
        const hasHistory = options?.hard ? 0 : await tx.client_tax_filings.count({
          where: { clientId, taxModelCode: m.model_number }
        });
        if (hasHistory > 0) {
          const res = await tx.client_tax_models.update({
            where: { id: m.id },
            data: { end_date: /* @__PURE__ */ new Date(), is_active: false }
          });
          if (res) deactivated += 1;
        } else {
          const res = await tx.client_tax_models.delete({ where: { id: m.id } });
          if (res) deleted += 1;
        }
      }
    });
    return { deleted, deactivated };
  }
  async getTaxAssignmentHistory(assignmentId) {
    const model = await prisma.client_tax_models.findUnique({
      where: { id: assignmentId }
    });
    if (!model) {
      return [];
    }
    const filings = await prisma.client_tax_filings.findMany({
      where: {
        clientId: model.client_id,
        taxModelCode: model.model_number
      },
      include: {
        fiscal_periods: true
      },
      orderBy: [
        { presentedAt: "desc" }
      ]
    });
    return filings.map((filing) => ({
      id: filing.id,
      status: normalizeStatus(filing.status, true),
      rawStatus: filing.status,
      presentedAt: filing.presentedAt,
      notes: filing.notes,
      tax_periods: filing.fiscal_periods ? {
        id: filing.fiscal_periods.id,
        year: filing.fiscal_periods.year,
        quarter: filing.fiscal_periods.quarter,
        label: filing.fiscal_periods.label,
        startsAt: filing.fiscal_periods.starts_at,
        endsAt: filing.fiscal_periods.ends_at
      } : null
    }));
  }
  async getAllClientTax() {
    return [];
  }
  async getTaxPeriod(id) {
    const period = await prisma.tax_periods.findUnique({ where: { id } });
    if (!period) return void 0;
    return {
      id: period.id,
      modeloId: period.modelo_id,
      anio: period.anio,
      trimestre: period.trimestre,
      mes: period.mes,
      inicioPresentacion: period.inicio_presentacion,
      finPresentacion: period.fin_presentacion
    };
  }
  async getTaxModel(id) {
    const model = await prisma.tax_models.findUnique({ where: { id } });
    if (!model) return void 0;
    return {
      id: model.id,
      nombre: model.nombre,
      descripcion: model.descripcion
    };
  }
  async getTaxModelConfigMap(client) {
    const configs = await client.tax_models_config.findMany({ where: { isActive: true } });
    const map = /* @__PURE__ */ new Map();
    configs.forEach((config) => {
      map.set(config.code, mapPrismaTaxModelsConfig(config));
    });
    return map;
  }
  periodDescriptorsForYear(year) {
    const descriptors = [];
    for (let month = 0; month < 12; month++) {
      descriptors.push({
        label: `M${String(month + 1).padStart(2, "0")}`,
        kind: TaxPeriodType.MONTHLY,
        startsAt: new Date(Date.UTC(year, month, 1)),
        endsAt: new Date(Date.UTC(year, month + 1, 0))
      });
    }
    const quarterLastDay = (quarter) => {
      const endMonth = quarter * 3;
      return new Date(Date.UTC(year, endMonth, 0));
    };
    for (let q = 1; q <= 4; q++) {
      const startMonth = (q - 1) * 3;
      const startsAt = new Date(Date.UTC(year, startMonth, 1));
      const endsAt = quarterLastDay(q);
      descriptors.push({
        label: `${q}T`,
        quarter: q,
        kind: TaxPeriodType.QUARTERLY,
        startsAt,
        endsAt
      });
    }
    descriptors.push({
      label: "ANUAL",
      kind: TaxPeriodType.ANNUAL,
      startsAt: new Date(Date.UTC(year, 0, 1)),
      endsAt: new Date(Date.UTC(year, 11, 31))
    });
    const specialMonths = [
      { label: "Abril", month: 3 },
      { label: "Octubre", month: 9 },
      { label: "Diciembre", month: 11 }
    ];
    specialMonths.forEach(({ label, month }) => {
      const startsAt = new Date(Date.UTC(year, month, 1));
      const endsAt = new Date(Date.UTC(year, month + 1, 0));
      descriptors.push({
        label,
        kind: TaxPeriodType.SPECIAL,
        startsAt,
        endsAt
      });
    });
    return descriptors;
  }
  async generateFilingsForPeriods(client, periods) {
    if (periods.length === 0) return;
    const models = await client.client_tax_models.findMany({
      where: {
        is_active: true,
        clients: { isActive: true }
      },
      include: {
        clients: {
          select: {
            id: true,
            razonSocial: true,
            isActive: true
          }
        }
      }
    });
    if (models.length === 0) return;
    const configMap = await this.getTaxModelConfigMap(client);
    for (const period of periods) {
      for (const model of models) {
        if (!this.periodMatchesModel(period, model, configMap)) continue;
        await client.client_tax_filings.upsert({
          where: {
            clientId_taxModelCode_periodId: {
              clientId: model.client_id,
              taxModelCode: model.model_number,
              periodId: period.id
            }
          },
          create: {
            id: randomUUID(),
            clientId: model.client_id,
            taxModelCode: model.model_number,
            periodId: period.id,
            status: FilingStatus.NOT_STARTED
          },
          update: {}
        });
      }
    }
  }
  periodMatchesModel(period, model, configMap) {
    if (!model.is_active) return false;
    const code = String(model.model_number ?? "").toUpperCase();
    const periodType = String(model.period_type ?? "").toUpperCase();
    const periodicity = this.periodTypeToSpanish(periodType);
    const config = configMap.get(code);
    const allowedPeriods = config?.allowedPeriods?.map((p) => p.toUpperCase()) ?? [];
    const matchesPeriodicity = (...targets) => targets.some(
      (target) => periodicity === target || allowedPeriods.includes(target)
    );
    const modelStart = model.start_date ? new Date(model.start_date) : null;
    const modelEnd = model.end_date ? new Date(model.end_date) : null;
    const periodStart = period.startsAt ? new Date(period.startsAt) : null;
    const periodEnd = period.endsAt ? new Date(period.endsAt) : null;
    if (modelStart && periodEnd && modelStart > periodEnd) {
      return false;
    }
    if (modelEnd && periodStart && modelEnd < periodStart) {
      return false;
    }
    switch (period.kind) {
      case TaxPeriodType.MONTHLY:
        return matchesPeriodicity("MENSUAL");
      case TaxPeriodType.QUARTERLY:
        return matchesPeriodicity("TRIMESTRAL");
      case TaxPeriodType.ANNUAL:
        return matchesPeriodicity("ANUAL");
      case TaxPeriodType.SPECIAL:
        if (code !== "202") return false;
        if (!matchesPeriodicity("ESPECIAL_FRACCIONADO")) return false;
        if (!config?.labels || config.labels.length === 0) return true;
        return config.labels.some(
          (label) => label.toLowerCase() === period.label.toLowerCase()
        );
      default:
        return false;
    }
  }
  async getFiscalPeriodsSummary(year) {
    const where = {};
    if (year) where.year = year;
    const periods = await prisma.fiscal_periods.findMany({
      where,
      orderBy: [{ year: "desc" }, { starts_at: "desc" }]
      // Note: fiscal_periods doesn't have a direct 'filings' relation
      // client_tax_filings has periodId pointing to fiscal_periods
    });
    return periods.map((period) => {
      const totals = { total: 0, notStarted: 0, inProgress: 0, presented: 0 };
      return {
        id: period.id,
        year: period.year,
        quarter: period.quarter ?? null,
        label: period.label,
        kind: period.kind,
        status: period.status,
        startsAt: period.starts_at,
        endsAt: period.ends_at,
        lockedAt: period.locked_at,
        totals
      };
    });
  }
  async createFiscalYear(year) {
    const descriptors = this.periodDescriptorsForYear(year);
    const created = [];
    await prisma.$transaction(async (tx) => {
      for (const descriptor of descriptors) {
        const period = await tx.fiscal_periods.upsert({
          where: {
            year_label: {
              year,
              label: descriptor.label
            }
          },
          update: {
            starts_at: descriptor.startsAt,
            ends_at: descriptor.endsAt,
            kind: descriptor.kind,
            quarter: descriptor.quarter ?? null
          },
          create: {
            id: randomUUID(),
            year,
            quarter: descriptor.quarter ?? null,
            label: descriptor.label,
            kind: descriptor.kind,
            starts_at: descriptor.startsAt,
            ends_at: descriptor.endsAt
          }
        });
        created.push(period);
      }
      await this.generateFilingsForPeriods(
        tx,
        created.map((period) => ({
          id: period.id,
          kind: period.kind,
          label: period.label,
          year: period.year,
          startsAt: period.starts_at,
          endsAt: period.ends_at
        }))
      );
    });
    return this.getFiscalPeriodsSummary(year);
  }
  async createFiscalPeriod(data) {
    const period = await prisma.fiscal_periods.upsert({
      where: {
        year_label: {
          year: data.year,
          label: data.label
        }
      },
      update: {
        quarter: data.quarter ?? null,
        kind: data.kind,
        starts_at: data.startsAt,
        ends_at: data.endsAt
      },
      create: {
        id: randomUUID(),
        year: data.year,
        quarter: data.quarter ?? null,
        label: data.label,
        kind: data.kind,
        starts_at: data.startsAt,
        ends_at: data.endsAt
      }
    });
    await this.generateFilingsForPeriods(prisma, [
      {
        id: period.id,
        kind: period.kind,
        label: period.label,
        year: period.year,
        startsAt: period.starts_at,
        endsAt: period.ends_at
      }
    ]);
    const summaries = await this.getFiscalPeriodsSummary(data.year);
    return summaries.find((item) => item.id === period.id) ?? summaries[0];
  }
  /**
   * Asegura que existan clientTaxFiling para todas las asignaciones activas
   * del año indicado, recorriendo los fiscal_periods de ese año.
   */
  async ensureClientTaxFilingsForYear(year) {
    const periods = await prisma.fiscal_periods.findMany({
      where: { year },
      select: {
        id: true,
        kind: true,
        label: true,
        year: true,
        starts_at: true,
        ends_at: true
      }
    });
    if (periods.length === 0) return { year, generated: 0 };
    await this.generateFilingsForPeriods(
      prisma,
      periods.map((p) => ({
        id: p.id,
        kind: p.kind,
        label: p.label,
        year: p.year,
        startsAt: p.starts_at,
        endsAt: p.ends_at
      }))
    );
    return { year, generated: periods.length };
  }
  /**
   * Migra obligaciones activas (obligaciones_fiscales) a modelos fiscales (client_tax_models)
   * en caso de que no exista aún la tupla (cliente + modelo).
   */
  async migrateObligationsToAssignments() {
    const obligaciones = await prisma.obligaciones_fiscales.findMany({
      where: { activo: true },
      include: { clients: true }
    });
    for (const ob of obligaciones) {
      const code = null;
      if (!code) continue;
      const existing = await prisma.client_tax_models.findFirst({
        where: { client_id: ob.cliente_id, model_number: code }
      });
      if (existing) continue;
      try {
        await prisma.client_tax_models.create({
          data: {
            id: randomUUID(),
            client_id: ob.cliente_id,
            model_number: code,
            period_type: this.spanishToEnglish(ob.periodicidad ?? (code === "303" ? "TRIMESTRAL" : "ANUAL")),
            start_date: ob.fecha_inicio ?? ob.fecha_asignacion ?? /* @__PURE__ */ new Date(),
            end_date: ob.fecha_fin ?? null,
            is_active: ob.activo ?? true,
            notes: ob.observaciones ?? null
          }
        });
      } catch (e) {
      }
    }
  }
  async ensureAssignmentsFromClientTaxModels() {
    const clients = await prisma.clients.findMany({
      where: { isActive: true },
      select: { id: true, tipo: true, fechaAlta: true, tax_models: true }
    });
    for (const c of clients) {
      let codes = [];
      const raw = c.tax_models;
      if (Array.isArray(raw)) codes = raw.map((x) => `${x}`.toUpperCase());
      else if (typeof raw === "string") {
        try {
          const arr = JSON.parse(raw);
          if (Array.isArray(arr)) codes = arr.map((x) => `${x}`.toUpperCase());
        } catch {
        }
      }
      for (const code of codes) {
        const exists = await prisma.client_tax_models.findFirst({ where: { client_id: c.id, model_number: code } });
        if (exists) continue;
        try {
          await prisma.client_tax_models.create({
            data: {
              id: randomUUID(),
              client_id: c.id,
              model_number: code,
              period_type: this.spanishToEnglish(code === "303" ? "TRIMESTRAL" : "ANUAL"),
              start_date: c.fechaAlta ?? /* @__PURE__ */ new Date(),
              end_date: null,
              is_active: true,
              notes: null
            }
          });
        } catch {
        }
      }
    }
  }
  async ensureDefault303Assignments() {
    const clients = await prisma.clients.findMany({ where: { isActive: true }, select: { id: true, fechaAlta: true } });
    for (const c of clients) {
      const count = await prisma.client_tax_models.count({ where: { client_id: c.id } });
      if (count > 0) continue;
      const exists303 = await prisma.client_tax_models.findFirst({ where: { client_id: c.id, model_number: "303" } });
      if (exists303) continue;
      try {
        await prisma.client_tax_models.create({
          data: {
            id: randomUUID(),
            client_id: c.id,
            model_number: "303",
            period_type: "QUARTERLY",
            start_date: c.fechaAlta ?? /* @__PURE__ */ new Date(),
            end_date: null,
            is_active: true,
            notes: "Asignaci\xF3n por defecto generada autom\xE1ticamente"
          }
        });
      } catch {
      }
    }
  }
  async getTaxFilings(filters) {
    const where = {};
    if (filters.periodId) where.periodId = filters.periodId;
    if (filters.status) {
      const s = String(filters.status).toUpperCase();
      const map = {
        "PENDIENTE": FilingStatus.NOT_STARTED,
        "NOT_STARTED": FilingStatus.NOT_STARTED,
        "CALCULADO": FilingStatus.IN_PROGRESS,
        "IN_PROGRESS": FilingStatus.IN_PROGRESS,
        "PRESENTADO": FilingStatus.PRESENTED,
        "PRESENTED": FilingStatus.PRESENTED
      };
      if (map[s]) where.status = map[s];
    }
    if (filters.model) where.taxModelCode = filters.model;
    if (filters.clientId) where.clientId = filters.clientId;
    const clientWhere = {};
    if (filters.clientId) clientWhere.id = filters.clientId;
    if (filters.gestorId) clientWhere.responsableAsignado = filters.gestorId;
    if (filters.search) clientWhere.razonSocial = { contains: filters.search, mode: "insensitive" };
    if (Object.keys(clientWhere).length > 0) where.clients = clientWhere;
    if (filters.year) {
      const y = typeof filters.year === "string" ? Number(filters.year) : filters.year;
      if (Number.isFinite(y)) {
        where.fiscal_periods = { ...where.fiscal_periods, year: y };
      }
    }
    const filings = await prisma.client_tax_filings.findMany({
      where,
      include: {
        clients: {
          select: {
            id: true,
            razonSocial: true,
            nifCif: true,
            responsableAsignado: true,
            users: {
              select: {
                username: true
              }
            }
          }
        },
        users: {
          select: {
            id: true,
            username: true
          }
        },
        fiscal_periods: true
      },
      orderBy: [{ clients: { razonSocial: "asc" } }]
    });
    const clientIds = Array.from(new Set(filings.map((f) => f.clientId)));
    const codes = Array.from(new Set(filings.map((f) => f.taxModelCode)));
    let byKey = /* @__PURE__ */ new Map();
    if (clientIds.length && codes.length) {
      const models = await prisma.client_tax_models.findMany({
        where: {
          client_id: { in: clientIds },
          model_number: { in: codes }
        },
        select: { client_id: true, model_number: true, start_date: true, end_date: true, is_active: true, period_type: true }
      });
      for (const m of models) {
        const key = `${m.client_id}:${m.model_number}`;
        if (!byKey.has(key)) byKey.set(key, []);
        byKey.get(key).push(m);
      }
    }
    const currentYear = filters.year ? typeof filters.year === "string" ? parseInt(filters.year) : filters.year : (/* @__PURE__ */ new Date()).getFullYear();
    const allCalendarEntries = await prisma.tax_calendar.findMany({
      where: {
        year: currentYear
      },
      select: {
        modelCode: true,
        period: true,
        status: true
      }
    });
    const openModelPeriods = /* @__PURE__ */ new Map();
    const calendarStatusMap = /* @__PURE__ */ new Map();
    for (const entry of allCalendarEntries) {
      const key = `${entry.modelCode}:${entry.period}`;
      calendarStatusMap.set(key, entry.status);
      if (entry.status === "ABIERTO") {
        if (!openModelPeriods.has(entry.modelCode)) {
          openModelPeriods.set(entry.modelCode, /* @__PURE__ */ new Set());
        }
        openModelPeriods.get(entry.modelCode).add(entry.period);
      }
    }
    const modelsWithPeriodicity = await prisma.client_tax_models.findMany({
      where: {
        client_id: { in: clientIds },
        model_number: { in: codes },
        is_active: true
      },
      select: { client_id: true, model_number: true, period_type: true }
    });
    const clientModelPeriodicity = /* @__PURE__ */ new Map();
    for (const m of modelsWithPeriodicity) {
      const key = `${m.client_id}:${m.model_number}`;
      const periodicidadSpanish = this.periodTypeToSpanish(m.period_type);
      clientModelPeriodicity.set(key, periodicidadSpanish);
    }
    const visible = filings.filter((f) => {
      if (!f.fiscal_periods) return false;
      const key = `${f.clientId}:${f.taxModelCode}`;
      const arr = byKey.get(key);
      if (!arr || arr.length === 0) return false;
      const ps = f.fiscal_periods.starts_at;
      const pe = f.fiscal_periods.ends_at;
      const hasActiveModel = arr.some((m) => {
        if (!m.is_active) return false;
        const startOk = m.start_date <= pe;
        const endOk = !m.end_date || m.end_date >= ps;
        return startOk && endOk;
      });
      if (!hasActiveModel) return false;
      const periodicity = clientModelPeriodicity.get(key);
      if (!periodicity) return false;
      const openPeriods = openModelPeriods.get(f.taxModelCode);
      if (!openPeriods || openPeriods.size === 0) return false;
      const filingPeriodKind = f.fiscal_periods.kind;
      let requiresPeriodType = null;
      if (periodicity === "MENSUAL" || periodicity === "MONTHLY") {
        requiresPeriodType = "MONTHLY";
      } else if (periodicity === "TRIMESTRAL" || periodicity === "QUARTERLY") {
        requiresPeriodType = "QUARTERLY";
      } else if (periodicity === "ANUAL" || periodicity === "ANNUAL") {
        requiresPeriodType = "ANNUAL";
      }
      if (!requiresPeriodType) return false;
      let periodMatches = false;
      if (requiresPeriodType === "MONTHLY") {
        periodMatches = filingPeriodKind === "MONTHLY" || filingPeriodKind === "SPECIAL" && f.fiscal_periods.label.startsWith("MES-");
      } else if (requiresPeriodType === "QUARTERLY") {
        periodMatches = filingPeriodKind === "QUARTERLY";
      } else if (requiresPeriodType === "ANNUAL") {
        periodMatches = filingPeriodKind === "ANNUAL";
      }
      if (!periodMatches) return false;
      if (requiresPeriodType === "MONTHLY") {
        let filingMonthCode = null;
        const rl = (f.fiscal_periods?.label ?? "").toString();
        const mMatch = rl.match(/^M(\d{2})$/i);
        if (mMatch) {
          filingMonthCode = `M${mMatch[1]}`;
        } else if (f.fiscal_periods?.starts_at) {
          try {
            const dt = new Date(f.fiscal_periods.starts_at);
            const month = dt.getMonth() + 1;
            filingMonthCode = `M${String(month).padStart(2, "0")}`;
          } catch (e) {
            filingMonthCode = null;
          }
        }
        if (filingMonthCode && openPeriods.has(filingMonthCode)) return true;
        return false;
      }
      if (requiresPeriodType === "QUARTERLY") {
        const q = f.fiscal_periods?.quarter;
        if (q && openPeriods.has(`${q}T`)) return true;
        return false;
      }
      if (requiresPeriodType === "ANNUAL") {
        if (openPeriods.has("ANUAL")) return true;
        return false;
      }
      return false;
    });
    const allFilings = visible.map((filing) => {
      let periodCode = null;
      const filingPeriodKind = filing.fiscal_periods?.kind;
      if (filingPeriodKind === "MONTHLY" || filingPeriodKind === "SPECIAL" && filing.fiscal_periods?.label?.startsWith("MES-")) {
        const rl = (filing.fiscal_periods?.label ?? "").toString();
        const mMatch = rl.match(/^M(\d{2})$/i);
        if (mMatch) {
          periodCode = `M${mMatch[1]}`;
        } else if (filing.fiscal_periods?.starts_at) {
          try {
            const dt = new Date(filing.fiscal_periods.starts_at);
            const month = dt.getMonth() + 1;
            periodCode = `M${String(month).padStart(2, "0")}`;
          } catch (e) {
            periodCode = null;
          }
        }
      } else if (filingPeriodKind === "QUARTERLY") {
        const q = filing.fiscal_periods?.quarter;
        if (q) periodCode = `${q}T`;
      } else if (filingPeriodKind === "ANNUAL") {
        periodCode = "ANUAL";
      }
      const calendarKey = periodCode ? `${filing.taxModelCode}:${periodCode}` : null;
      const calendarStatus = calendarKey ? calendarStatusMap.get(calendarKey) ?? null : null;
      return {
        id: filing.id,
        clientId: filing.clientId,
        clientName: filing.clients?.razonSocial ?? "",
        nifCif: filing.clients?.nifCif ?? "",
        gestorId: filing.clients?.responsableAsignado ?? null,
        gestorName: filing.clients?.users?.username ?? null,
        taxModelCode: filing.taxModelCode,
        periodId: filing.periodId,
        periodLabel: formatPeriodLabel(filing.fiscal_periods),
        periodKind: filing.fiscal_periods?.kind ?? null,
        periodStatus: filing.fiscal_periods?.status ?? null,
        calendarStatus,
        status: normalizeStatus(filing.status, true),
        notes: filing.notes ?? null,
        presentedAt: filing.presentedAt ?? null,
        assigneeId: filing.users?.id ?? null,
        assigneeName: filing.users?.username ?? null
      };
    });
    if (!filters.includeClosedPeriods) {
      return allFilings.filter((filing) => filing.calendarStatus === "ABIERTO");
    }
    return allFilings;
  }
  async updateTaxFiling(id, data, options = {}) {
    const filing = await prisma.client_tax_filings.findUnique({
      where: { id },
      include: {
        fiscal_periods: true
      }
    });
    if (!filing) {
      throw new Error("Declaraci\xF3n no encontrada");
    }
    if (filing.fiscal_periods?.status === PeriodStatus.CLOSED && !options.allowClosed) {
      throw new Error("El periodo est\xE1 cerrado. Solo un administrador puede modificarlo.");
    }
    let nextStatus = void 0;
    if (data.status !== void 0) {
      const raw = String(data.status).toUpperCase();
      const map = {
        "PENDIENTE": FilingStatus.NOT_STARTED,
        "NOT_STARTED": FilingStatus.NOT_STARTED,
        "CALCULADO": FilingStatus.IN_PROGRESS,
        "IN_PROGRESS": FilingStatus.IN_PROGRESS,
        "PRESENTADO": FilingStatus.PRESENTED,
        "PRESENTED": FilingStatus.PRESENTED
      };
      nextStatus = map[raw] ?? data.status;
    }
    const updated = await prisma.client_tax_filings.update({
      where: { id },
      data: {
        status: nextStatus ?? filing.status,
        notes: data.notes !== void 0 ? data.notes : filing.notes,
        presentedAt: data.presentedAt !== void 0 ? data.presentedAt : filing.presentedAt,
        assigneeId: data.assigneeId !== void 0 ? data.assigneeId : filing.assigneeId
      },
      include: {
        fiscal_periods: true,
        clients: {
          select: {
            id: true,
            razonSocial: true,
            nifCif: true,
            responsableAsignado: true,
            users: { select: { username: true } }
          }
        },
        users: { select: { id: true, username: true } }
      }
    });
    return {
      id: updated.id,
      clientId: updated.clientId,
      clientName: updated.clients?.razonSocial ?? "",
      nifCif: updated.clients?.nifCif ?? "",
      gestorId: updated.clients?.responsableAsignado ?? null,
      gestorName: updated.clients?.users?.username ?? null,
      taxModelCode: updated.taxModelCode,
      periodId: updated.periodId,
      periodLabel: formatPeriodLabel(updated.fiscal_periods),
      periodKind: updated.fiscal_periods?.kind ?? null,
      periodStatus: updated.fiscal_periods?.status ?? null,
      status: normalizeStatus(updated.status, true),
      notes: updated.notes ?? null,
      presentedAt: updated.presentedAt ?? null,
      assigneeId: updated.users?.id ?? null,
      assigneeName: updated.users?.username ?? null
    };
  }
  async toggleFiscalPeriodStatus(id, status, userId) {
    const updates = {
      status
    };
    if (status === PeriodStatus.CLOSED) {
      updates.locked_at = /* @__PURE__ */ new Date();
      updates.closed_by = userId ?? null;
    } else {
      updates.locked_at = null;
      updates.closed_by = null;
    }
    return prisma.fiscal_periods.update({
      where: { id },
      data: updates
    });
  }
  async getFiscalPeriod(id) {
    const periods = await this.getFiscalPeriodsSummary();
    return periods.find((period) => period.id === id) ?? null;
  }
  async getTaxControlMatrix(params = {}) {
    const { type, gestorId, model, periodicity } = params;
    const clientWhere = {};
    if (type) {
      clientWhere.tipo = type.toString().toUpperCase();
    }
    if (gestorId) {
      clientWhere.responsableAsignado = gestorId;
    }
    const clients = await prisma.clients.findMany({
      where: clientWhere,
      orderBy: { razonSocial: "asc" },
      include: {
        users: {
          select: {
            id: true,
            username: true,
            email: true
          }
        },
        client_tax_models: true
      }
    });
    const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
    const requestedYear = params.year === void 0 || params.year === null || params.year === "" ? null : Number(params.year);
    const selectedYear = Number.isFinite(requestedYear) ? Number(requestedYear) : currentYear;
    const parsedQuarter = (() => {
      if (params.quarter === void 0 || params.quarter === null || params.quarter === "") {
        return null;
      }
      const raw = typeof params.quarter === "number" ? params.quarter : Number(String(params.quarter).replace(/[^0-9]/g, ""));
      return Number.isFinite(raw) ? Number(raw) : null;
    })();
    const periodWhere = {};
    if (selectedYear) {
      periodWhere.year = selectedYear;
    }
    if (parsedQuarter !== null) {
      periodWhere.quarter = parsedQuarter;
    }
    const fiscal_periodss = await prisma.fiscal_periods.findMany({
      where: periodWhere,
      select: {
        id: true,
        year: true,
        quarter: true,
        ends_at: true,
        label: true
      }
    });
    const periodIds = fiscal_periodss.map((period) => period.id);
    const filingWhere = {};
    if (periodIds.length > 0) {
      filingWhere.periodId = { in: periodIds };
    } else if (selectedYear) {
      filingWhere.fiscal_periods = { year: selectedYear };
    }
    const filings = await prisma.client_tax_filings.findMany({
      where: filingWhere,
      include: {
        fiscal_periods: true
      }
    });
    const filingsMap = /* @__PURE__ */ new Map();
    for (const filing of filings) {
      const key = `${filing.clientId}_${filing.taxModelCode}`;
      const statusKey = (filing.status || "").toUpperCase();
      const rank = STATUS_PRIORITY[statusKey] ?? 0;
      const existing = filingsMap.get(key);
      if (!existing) {
        filingsMap.set(key, { filing, rank });
        continue;
      }
      const existingDate = existing.filing.fiscal_periods?.ends_at ? new Date(existing.filing.fiscal_periods.ends_at).getTime() : 0;
      const candidateDate = filing.fiscal_periods?.ends_at ? new Date(filing.fiscal_periods.ends_at).getTime() : 0;
      if (rank > existing.rank || rank === existing.rank && candidateDate > existingDate) {
        filingsMap.set(key, { filing, rank });
      }
    }
    const searchValue = typeof params.search === "string" ? params.search.trim() : "";
    const searchLower = searchValue.toLowerCase();
    const searchUpper = searchValue.toUpperCase();
    const hasSearch = searchValue.length > 0;
    const rows = [];
    const startOfYear = new Date(Date.UTC(selectedYear, 0, 1, 0, 0, 0));
    const endOfYear = new Date(Date.UTC(selectedYear, 11, 31, 23, 59, 59));
    for (const client of clients) {
      const cells = {};
      for (const code of TAX_CONTROL_MODELS) {
        cells[code] = { active: false };
      }
      const taxModels = client.client_tax_models || [];
      for (const taxModel of taxModels) {
        const code = taxModel.model_number;
        if (!TAX_CONTROL_MODELS.includes(code)) continue;
        if (model && code !== String(model).toUpperCase()) continue;
        const periodicidadSpanish = this.periodTypeToSpanish(taxModel.period_type);
        if (periodicity && periodicidadSpanish !== String(periodicity).toUpperCase()) continue;
        const startDate = taxModel.start_date ? new Date(taxModel.start_date) : null;
        const endDate = taxModel.end_date ? new Date(taxModel.end_date) : null;
        const effectiveActive = Boolean(taxModel.is_active) && (!startDate || startDate <= endOfYear) && (!endDate || endDate >= startOfYear);
        const filingEntry = filingsMap.get(`${client.id}_${code}`);
        const filing = filingEntry?.filing;
        const normalizedStatus = normalizeStatus(filing?.status, effectiveActive);
        cells[code] = {
          assignmentId: taxModel.id,
          active: effectiveActive,
          periodicity: periodicidadSpanish,
          startDate: taxModel.start_date,
          endDate: taxModel.end_date,
          activeFlag: taxModel.is_active,
          status: normalizedStatus,
          statusUpdatedAt: filing?.presentedAt ?? filing?.fiscal_periods?.ends_at ?? null,
          filingId: filing?.id ?? null,
          periodId: filing?.periodId ?? null,
          periodLabel: formatPeriodLabel(filing?.fiscal_periods)
        };
      }
      let matchesSearch = true;
      if (hasSearch) {
        const matchesClient = client.razonSocial?.toLowerCase().includes(searchLower) || client.nifCif?.toLowerCase().includes(searchLower);
        const matchesModel = TAX_CONTROL_MODELS.some(
          (code) => code.includes(searchUpper) && (cells[code].assignmentId || cells[code].active || cells[code].status)
        );
        matchesSearch = matchesClient || matchesModel;
      }
      if (!matchesSearch) {
        continue;
      }
      const hasAnyActive = Object.values(cells).some((c) => c.active === true);
      if (!hasAnyActive) {
        continue;
      }
      rows.push({
        clientId: client.id,
        clientName: client.razonSocial,
        nifCif: client.nifCif,
        clientType: client.tipo,
        gestorId: client.responsableAsignado ?? null,
        gestorName: client.users?.username ?? null,
        gestorEmail: client.users?.email ?? null,
        cells
      });
    }
    return {
      rows,
      models: TAX_CONTROL_MODELS,
      metadata: {
        year: selectedYear ?? null,
        quarter: parsedQuarter,
        totalClients: rows.length,
        filters: {
          type: type ?? null,
          gestorId: gestorId ?? null,
          search: hasSearch ? searchValue : null
        }
      }
    };
  }
  /**
   * Genera declaraciones faltantes para un año dado a partir de obligaciones activas
   */
  async ensureDeclarationsForYear(year) {
    const startOfYear = new Date(Date.UTC(year, 0, 1, 0, 0, 0));
    const endOfYear = new Date(Date.UTC(year, 11, 31, 23, 59, 59));
    const obligaciones = await prisma.obligaciones_fiscales.findMany({
      where: {
        activo: true,
        OR: [
          { fecha_fin: null },
          { fecha_fin: { gte: startOfYear } }
        ],
        fecha_inicio: { lte: endOfYear }
      },
      include: { clients: true }
    });
    let created = 0;
    let skipped = 0;
    for (const ob of obligaciones) {
      const modelCode = null;
      if (!modelCode) {
        skipped++;
        continue;
      }
      const where = { modelCode, year };
      if (ob.periodicidad === "MENSUAL") {
        where.period = { in: ["M01", "M02", "M03", "M04", "M05", "M06", "M07", "M08", "M09", "M10", "M11", "M12"] };
      } else if (ob.periodicidad === "TRIMESTRAL") {
        where.period = { in: ["1T", "2T", "3T", "4T"] };
      } else {
        where.period = "ANUAL";
      }
      const periods = await prisma.tax_calendar.findMany({ where, select: { id: true } });
      for (const p of periods) {
        const exists = await prisma.declaraciones.findFirst({
          where: { obligacion_id: ob.id, calendario_id: p.id },
          select: { id: true }
        });
        if (exists) {
          skipped++;
          continue;
        }
        created++;
      }
    }
    return { year, obligaciones: obligaciones.length, created, skipped };
  }
  // ==================== IMPUESTO METHODS ====================
  async getAllImpuestos() {
    return await prisma.impuestos.findMany({
      orderBy: { modelo: "asc" }
    });
  }
  async getImpuesto(id) {
    return await prisma.impuestos.findUnique({
      where: { id }
    });
  }
  async getImpuestoByModelo(modelo) {
    return await prisma.impuestos.findUnique({
      where: { modelo }
    });
  }
  async createImpuesto(data) {
    return await prisma.impuestos.create({
      data: {
        id: randomUUID(),
        modelo: data.modelo,
        nombre: data.nombre,
        descripcion: data.descripcion,
        updatedAt: /* @__PURE__ */ new Date()
      }
    });
  }
  async updateImpuesto(id, data) {
    return await prisma.impuestos.update({
      where: { id },
      data
    });
  }
  async deleteImpuesto(id) {
    await prisma.impuestos.delete({
      where: { id }
    });
    return true;
  }
  // ==================== OBLIGACION FISCAL METHODS ====================
  async getAllObligacionesFiscales() {
    return await prisma.obligaciones_fiscales.findMany({
      include: {
        clients: true,
        impuestos: true
      },
      orderBy: { fecha_asignacion: "desc" }
    });
  }
  async getObligacionFiscal(id) {
    return await prisma.obligaciones_fiscales.findUnique({
      where: { id },
      include: {
        clients: true,
        impuestos: true
      }
    });
  }
  async getObligacionesByCliente(cliente_id) {
    return await prisma.obligaciones_fiscales.findMany({
      where: { cliente_id },
      include: {
        clients: true,
        impuestos: true
      },
      orderBy: { fecha_asignacion: "desc" }
    });
  }
  async createObligacionFiscal(data) {
    return await prisma.obligaciones_fiscales.create({
      data,
      include: {
        clients: true,
        impuestos: true
      }
    });
  }
  async updateObligacionFiscal(id, data) {
    return await prisma.obligaciones_fiscales.update({
      where: { id },
      data,
      include: {
        clients: true,
        impuestos: true
      }
    });
  }
  async deleteObligacionFiscal(id) {
    await prisma.obligaciones_fiscales.delete({
      where: { id }
    });
    return true;
  }
  // ==================== TAX CALENDAR METHODS ====================
  async listTaxCalendar(params) {
    const where = {};
    if (typeof params?.year === "number") {
      where.year = params.year;
    }
    if (params?.modelCode) {
      where.modelCode = params.modelCode;
    }
    if (typeof params?.active === "boolean") {
      where.active = params.active;
    }
    return await prisma.tax_calendar.findMany({
      where,
      orderBy: [
        { year: "desc" },
        { modelCode: "asc" }
      ]
    });
  }
  async getTaxCalendar(id) {
    return await prisma.tax_calendar.findUnique({
      where: { id }
    });
  }
  async createTaxCalendar(data) {
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    const derived = calculateDerivedFields(startDate, endDate);
    return await prisma.tax_calendar.create({
      data: {
        id: data.id || randomUUID(),
        modelCode: data.modelCode,
        period: data.period,
        year: data.year,
        startDate,
        endDate,
        status: derived.status || data.status,
        days_to_start: derived.daysToStart ?? data.daysToStart ?? null,
        days_to_end: derived.daysToEnd ?? data.daysToEnd ?? null,
        active: data.active ?? true,
        locked: data.locked ?? false,
        createdAt: data.createdAt || /* @__PURE__ */ new Date(),
        updatedAt: data.updatedAt || /* @__PURE__ */ new Date()
      }
    });
  }
  async updateTaxCalendar(id, data) {
    const existing = await prisma.tax_calendar.findUnique({
      where: { id }
    });
    if (!existing) {
      throw new Error("Tax calendar entry not found");
    }
    const startDate = data.startDate ? new Date(data.startDate) : existing.startDate;
    const endDate = data.endDate ? new Date(data.endDate) : existing.endDate;
    const derived = calculateDerivedFields(startDate, endDate);
    const updatePayload = {};
    if (data.modelCode !== void 0) updatePayload.modelCode = data.modelCode;
    if (data.period !== void 0) updatePayload.period = data.period;
    if (data.year !== void 0) updatePayload.year = data.year;
    updatePayload.startDate = startDate;
    updatePayload.endDate = endDate;
    updatePayload.status = derived.status ?? data.status ?? existing.status;
    updatePayload.days_to_start = derived.daysToStart ?? (data.daysToStart ?? data.days_to_start ?? null);
    updatePayload.days_to_end = derived.daysToEnd ?? (data.daysToEnd ?? data.days_to_end ?? null);
    if (data.active !== void 0) updatePayload.active = data.active;
    if (data.locked !== void 0) updatePayload.locked = data.locked;
    updatePayload.updatedAt = /* @__PURE__ */ new Date();
    return await prisma.tax_calendar.update({
      where: { id },
      data: updatePayload
    });
  }
  async deleteTaxCalendar(id) {
    await prisma.tax_calendar.delete({
      where: { id }
    });
    return true;
  }
  async cloneTaxCalendarYear(year) {
    const items = await prisma.tax_calendar.findMany({
      where: { year }
    });
    if (!items.length) return [];
    const targetYear = year + 1;
    const now = /* @__PURE__ */ new Date();
    const clonesData = items.map((item) => {
      const start = new Date(item.startDate);
      const end = new Date(item.endDate);
      start.setFullYear(start.getFullYear() + 1);
      end.setFullYear(end.getFullYear() + 1);
      const derived = calculateDerivedFields(start, end);
      return {
        modelCode: item.modelCode,
        tax_periods: item.period,
        year: targetYear,
        startDate: start,
        endDate: end,
        status: derived.status,
        daysToStart: derived.daysToStart,
        daysToEnd: derived.daysToEnd,
        active: item.active,
        createdAt: now,
        updatedAt: now
      };
    });
    const created = await prisma.$transaction(
      clonesData.map(
        (data) => prisma.tax_calendar.create({
          data: {
            id: randomUUID(),
            period: data.tax_periods,
            modelCode: data.modelCode,
            year: data.year,
            startDate: data.startDate,
            endDate: data.endDate,
            status: data.status,
            days_to_start: data.daysToStart,
            days_to_end: data.daysToEnd,
            active: data.active,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt
          }
        })
      )
    );
    return created;
  }
  async seedTaxCalendarYear(year, opts) {
    const targetCode = opts?.modelCode ? opts.modelCode.toUpperCase() : null;
    const rawConfigs = await prisma.tax_models_config.findMany({
      where: {
        isActive: true,
        ...targetCode ? { code: targetCode } : {}
      },
      select: {
        code: true,
        allowedPeriods: true
      }
    });
    const configByCode = /* @__PURE__ */ new Map();
    rawConfigs.forEach((config) => {
      configByCode.set(config.code.toUpperCase(), {
        allowedPeriods: mapJsonArray(config.allowedPeriods)
      });
    });
    const modelConfigs = [];
    const codes = targetCode ? [targetCode] : Array.from(configByCode.keys());
    if (targetCode && !configByCode.has(targetCode)) {
      codes.push(targetCode);
    }
    for (const code of codes) {
      const allowed = /* @__PURE__ */ new Set();
      const stored = configByCode.get(code);
      stored?.allowedPeriods.forEach((period) => allowed.add(period.toUpperCase()));
      const rule = TAX_RULES[code];
      if (rule) {
        rule.allowedPeriods.forEach((period) => allowed.add(period.toUpperCase()));
      }
      if (allowed.size === 0) {
        allowed.add("TRIMESTRAL");
        allowed.add("ANUAL");
      }
      modelConfigs.push({ code, allowed });
    }
    const makeDate = (y, m, d) => new Date(Date.UTC(y, m, d));
    const pushRecord = (modelCode, periodLabel, start, end) => {
      const derived = calculateDerivedFields(start, end);
      const now = /* @__PURE__ */ new Date();
      records.push({
        id: randomUUID(),
        modelCode,
        period: periodLabel,
        year,
        startDate: start,
        endDate: end,
        status: derived.status,
        days_to_start: derived.daysToStart,
        days_to_end: derived.daysToEnd,
        active: true,
        createdAt: now,
        updatedAt: now
      });
    };
    const records = [];
    const includeMonthly = !opts?.periodicity || opts.periodicity === "all" || opts.periodicity === "monthly";
    const includeQuarterly = !opts?.periodicity || opts.periodicity === "all" || opts.periodicity === "quarterly";
    const includeAnnual = !opts?.periodicity || opts.periodicity === "all" || opts.periodicity === "annual";
    const includeSpecial = !opts?.periodicity || opts.periodicity === "all" || opts.periodicity === "special";
    for (const { code, allowed } of modelConfigs) {
      const supportsMonthly = allowed.has("MENSUAL");
      const supportsQuarterly = allowed.has("TRIMESTRAL");
      const supportsAnnual = allowed.has("ANUAL");
      const supportsSpecial = allowed.has("ESPECIAL_FRACCIONADO") || code === "202";
      if (includeMonthly && supportsMonthly) {
        for (let m = 1; m <= 12; m++) {
          const period = `M${String(m).padStart(2, "0")}`;
          const nextMonth = m === 12 ? 0 : m;
          const nextYear = m === 12 ? year + 1 : year;
          const start = makeDate(nextYear, nextMonth, 1);
          const end = makeDate(nextYear, nextMonth, 20);
          pushRecord(code, period, start, end);
        }
      }
      if (includeQuarterly && supportsQuarterly) {
        const quarters = [
          { label: "1T", start: makeDate(year, 3, 1), end: makeDate(year, 3, 20) },
          { label: "2T", start: makeDate(year, 6, 1), end: makeDate(year, 6, 20) },
          { label: "3T", start: makeDate(year, 9, 1), end: makeDate(year, 9, 20) },
          { label: "4T", start: makeDate(year + 1, 0, 1), end: makeDate(year + 1, 0, 30) }
        ];
        for (const q of quarters) {
          pushRecord(code, q.label, q.start, q.end);
        }
      }
      if (includeAnnual && supportsAnnual) {
        const start = makeDate(year + 1, 0, 1);
        const end = makeDate(year + 1, 0, 30);
        pushRecord(code, "ANUAL", start, end);
      }
      if (includeSpecial && supportsSpecial && code === "202") {
        const months = [4, 10, 12];
        for (const m of months) {
          const nextMonth = m === 12 ? 0 : m;
          const nextYear = m === 12 ? year + 1 : year;
          const start = makeDate(nextYear, nextMonth, 1);
          const end = makeDate(nextYear, nextMonth, 20);
          pushRecord(code, `M${String(m).padStart(2, "0")}`, start, end);
        }
      }
    }
    if (records.length === 0) return { created: 0 };
    await prisma.tax_calendar.createMany({ data: records, skipDuplicates: true });
    return { created: records.length };
  }
  // ==================== DECLARACION METHODS ====================
  async getAllDeclaraciones() {
    return await prisma.declaraciones.findMany({
      include: {
        obligaciones_fiscales: {
          include: {
            clients: true,
            impuestos: true
          }
        }
      },
      orderBy: { fecha_presentacion: "desc" }
    });
  }
  async getDeclaracion(id) {
    return await prisma.declaraciones.findUnique({
      where: { id },
      include: {
        obligaciones_fiscales: {
          include: {
            clients: true,
            impuestos: true
          }
        }
      }
    });
  }
  async getDeclaracionesByObligacion(obligacion_id) {
    return await prisma.declaraciones.findMany({
      where: { obligacion_id },
      include: {
        obligaciones_fiscales: {
          include: {
            clients: true,
            impuestos: true
          }
        }
      },
      orderBy: { fecha_presentacion: "desc" }
    });
  }
  async getDeclaracionesByCliente(cliente_id) {
    return await prisma.declaraciones.findMany({
      where: {
        obligaciones_fiscales: {
          cliente_id
        }
      },
      include: {
        obligaciones_fiscales: {
          include: {
            clients: true,
            impuestos: true
          }
        }
      },
      orderBy: { fecha_presentacion: "desc" }
    });
  }
  async createDeclaracion(data) {
    return await prisma.declaraciones.create({
      data,
      include: {
        obligaciones_fiscales: {
          include: {
            clients: true,
            impuestos: true
          }
        }
      }
    });
  }
  async updateDeclaracion(id, data) {
    return await prisma.declaraciones.update({
      where: { id },
      data,
      include: {
        obligaciones_fiscales: {
          include: {
            clients: true,
            impuestos: true
          }
        }
      }
    });
  }
  async deleteDeclaracion(id) {
    await prisma.declaraciones.delete({
      where: { id }
    });
    return true;
  }
  // ==================== TASK METHODS ====================
  async getAllTasks() {
    const tasks = await prisma.tasks.findMany();
    return tasks.map(mapPrismaTask);
  }
  async getTask(id) {
    const task = await prisma.tasks.findUnique({ where: { id } });
    return task ? mapPrismaTask(task) : void 0;
  }
  async createTask(insertTask) {
    const task = await prisma.tasks.create({
      data: {
        id: randomUUID(),
        titulo: insertTask.titulo,
        descripcion: insertTask.descripcion,
        clients: insertTask.clienteId ? { connect: { id: insertTask.clienteId } } : void 0,
        users: insertTask.asignadoA ? { connect: { id: insertTask.asignadoA } } : void 0,
        prioridad: insertTask.prioridad,
        estado: insertTask.estado,
        visibilidad: insertTask.visibilidad,
        fecha_vencimiento: insertTask.fechaVencimiento,
        fecha_actualizacion: /* @__PURE__ */ new Date()
      }
    });
    return mapPrismaTask(task);
  }
  async updateTask(id, updateData) {
    try {
      const task = await prisma.tasks.update({
        where: { id },
        data: updateData
      });
      return mapPrismaTask(task);
    } catch {
      return void 0;
    }
  }
  async deleteTask(id) {
    try {
      await prisma.tasks.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }
  // ==================== MANUAL METHODS ====================
  async getAllManuals() {
    const manuals = await prisma.manuals.findMany();
    return manuals.map(mapPrismaManual);
  }
  async getManual(id) {
    const manual = await prisma.manuals.findUnique({ where: { id } });
    return manual ? mapPrismaManual(manual) : void 0;
  }
  async createManual(insertManual) {
    const autorId = insertManual.autorId ?? insertManual.autor_id ?? insertManual.authorId;
    if (!autorId) {
      throw new Error("Autor del manual no especificado");
    }
    const etiquetasValue = Array.isArray(insertManual.etiquetas) && insertManual.etiquetas.length > 0 ? JSON.stringify(insertManual.etiquetas) : null;
    const manual = await prisma.manuals.create({
      data: {
        id: randomUUID(),
        titulo: insertManual.titulo ?? "Sin t\xEDtulo",
        contenido_html: insertManual.contenidoHtml ?? "",
        autor_id: autorId,
        etiquetas: etiquetasValue,
        categoria: insertManual.categoria ?? null,
        status: insertManual.publicado ? "PUBLISHED" : "DRAFT",
        fecha_publicacion: insertManual.publicado ? /* @__PURE__ */ new Date() : null,
        fecha_actualizacion: /* @__PURE__ */ new Date()
      }
    });
    return mapPrismaManual(manual);
  }
  async updateManual(id, updateData) {
    try {
      const data = {};
      if (updateData.titulo !== void 0) data.titulo = updateData.titulo;
      if (updateData.contenidoHtml !== void 0) data.contenido_html = updateData.contenidoHtml ?? "";
      if (updateData.categoria !== void 0) data.categoria = updateData.categoria ?? null;
      if (updateData.etiquetas !== void 0) {
        data.etiquetas = Array.isArray(updateData.etiquetas) && updateData.etiquetas.length > 0 ? JSON.stringify(updateData.etiquetas) : null;
      }
      if (updateData.publicado !== void 0) {
        data.status = updateData.publicado ? "PUBLISHED" : "DRAFT";
        data.fecha_publicacion = updateData.publicado ? /* @__PURE__ */ new Date() : null;
      }
      if (updateData.autorId !== void 0 || updateData.autor_id !== void 0) {
        data.autor_id = updateData.autorId ?? updateData.autor_id;
      }
      data.fecha_actualizacion = /* @__PURE__ */ new Date();
      const manual = await prisma.manuals.update({
        where: { id },
        data
      });
      return mapPrismaManual(manual);
    } catch {
      return void 0;
    }
  }
  async deleteManual(id) {
    try {
      const result = await prisma.manuals.deleteMany({ where: { id } });
      return result.count > 0;
    } catch {
      return false;
    }
  }
  // ==================== MANUAL ATTACHMENT METHODS ====================
  async getManualAttachment(id) {
    const attachment = await prisma.manual_attachments.findUnique({ where: { id } });
    return attachment ? mapPrismaManualAttachment(attachment) : void 0;
  }
  async createManualAttachment(insertAttachment) {
    const attachment = await prisma.manual_attachments.create({
      data: {
        id: randomUUID(),
        manuals: { connect: { id: insertAttachment.manualId } },
        fileName: insertAttachment.fileName,
        original_name: insertAttachment.originalName,
        filePath: insertAttachment.filePath,
        file_type: insertAttachment.fileType,
        fileSize: insertAttachment.fileSize,
        uploaded_by: insertAttachment.uploadedBy
      }
    });
    return mapPrismaManualAttachment(attachment);
  }
  async deleteManualAttachment(id) {
    try {
      await prisma.manual_attachments.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }
  async getManualAttachments(manualId) {
    const attachments = await prisma.manual_attachments.findMany({
      where: { manualId },
      orderBy: { uploaded_at: "desc" }
    });
    return attachments.map(mapPrismaManualAttachment);
  }
  // ==================== MANUAL VERSION METHODS ====================
  async getManualVersion(id) {
    const version = await prisma.manual_versions.findUnique({ where: { id } });
    return version ? mapPrismaManualVersion(version) : void 0;
  }
  async createManualVersion(insertVersion) {
    const version = await prisma.manual_versions.create({
      data: {
        id: randomUUID(),
        manuals: { connect: { id: insertVersion.manualId } },
        versionNumber: insertVersion.versionNumber,
        titulo: insertVersion.titulo,
        contenido_html: insertVersion.contenidoHtml,
        etiquetas: insertVersion.etiquetas ? JSON.stringify(insertVersion.etiquetas) : null,
        categoria: insertVersion.categoria,
        createdBy: insertVersion.createdBy
      }
    });
    return mapPrismaManualVersion(version);
  }
  async getManualVersions(manualId) {
    const versions = await prisma.manual_versions.findMany({
      where: { manualId },
      orderBy: { versionNumber: "desc" }
    });
    return versions.map(mapPrismaManualVersion);
  }
  async getNextVersionNumber(manualId) {
    const lastVersion = await prisma.manual_versions.findFirst({
      where: { manualId },
      orderBy: { versionNumber: "desc" }
    });
    return lastVersion ? lastVersion.versionNumber + 1 : 1;
  }
  async restoreManualVersion(manualId, versionId) {
    const version = await prisma.manual_versions.findUnique({ where: { id: versionId } });
    if (!version) return void 0;
    const manual = await prisma.manuals.update({
      where: { id: manualId },
      data: {
        titulo: version.titulo,
        contenido_html: version.contenido_html,
        etiquetas: version.etiquetas,
        categoria: version.categoria
      }
    });
    return mapPrismaManual(manual);
  }
  // ==================== ACTIVITY LOG METHODS ====================
  async createActivityLog(insertLog) {
    const log2 = await prisma.activity_logs.create({
      data: {
        id: randomUUID(),
        users: { connect: { id: insertLog.usuarioId } },
        accion: insertLog.accion,
        modulo: insertLog.modulo,
        detalles: insertLog.detalles,
        fecha: /* @__PURE__ */ new Date()
      }
    });
    return mapPrismaActivityLog(log2);
  }
  async getAllActivityLogs() {
    const logs = await prisma.activity_logs.findMany({
      orderBy: { fecha: "desc" }
    });
    return logs.map(mapPrismaActivityLog);
  }
  // ==================== AUDIT TRAIL METHODS ====================
  async createAuditEntry(insertAudit) {
    const audit = await prisma.audit_trail.create({
      data: {
        id: randomUUID(),
        users: { connect: { id: insertAudit.usuarioId } },
        accion: insertAudit.accion,
        tabla: insertAudit.tabla,
        registroId: insertAudit.registroId,
        valorAnterior: insertAudit.valorAnterior,
        valorNuevo: insertAudit.valorNuevo,
        cambios: insertAudit.cambios,
        fecha: /* @__PURE__ */ new Date()
      }
    });
    return mapPrismaAuditTrail(audit);
  }
  async getAllAuditEntries() {
    const audits = await prisma.audit_trail.findMany({
      orderBy: { fecha: "desc" }
    });
    return audits.map(mapPrismaAuditTrail);
  }
  async getAuditEntriesByTable(tabla) {
    const audits = await prisma.audit_trail.findMany({
      where: { tabla },
      orderBy: { fecha: "desc" }
    });
    return audits.map(mapPrismaAuditTrail);
  }
  async getAuditEntriesByRecord(tabla, registroId) {
    const audits = await prisma.audit_trail.findMany({
      where: { tabla, registroId },
      orderBy: { fecha: "desc" }
    });
    return audits.map(mapPrismaAuditTrail);
  }
  async getAuditEntriesByUser(usuarioId) {
    const audits = await prisma.audit_trail.findMany({
      where: { usuarioId },
      orderBy: { fecha: "desc" }
    });
    return audits.map(mapPrismaAuditTrail);
  }
  // ==================== GLOBAL SEARCH ====================
  async globalSearch(query) {
    const searchTerm = query.toLowerCase();
    const allClients = await this.getAllClients();
    const clientes = allClients.filter(
      (c) => c.razonSocial.toLowerCase().includes(searchTerm) || c.nifCif.toLowerCase().includes(searchTerm)
    ).slice(0, 10);
    const allTasks = await this.getAllTasks();
    const tareas = allTasks.filter(
      (t) => t.titulo.toLowerCase().includes(searchTerm) || t.descripcion && t.descripcion.toLowerCase().includes(searchTerm)
    ).slice(0, 10);
    const allManuals = await this.getAllManuals();
    const manuales = allManuals.filter(
      (m) => m.titulo.toLowerCase().includes(searchTerm)
    ).slice(0, 10);
    const impuestos = [];
    const total = clientes.length + tareas.length + impuestos.length + manuales.length;
    return { clientes, tareas, impuestos, manuales, total };
  }
  // ==================== ROLES & PERMISSIONS ====================
  async getAllRoles() {
    return await prisma.roles.findMany({
      include: {
        role_permissions: {
          include: {
            permissions: true
          }
        },
        _count: {
          select: { users: true }
        }
      },
      orderBy: { name: "asc" }
    });
  }
  async getRoleById(id) {
    return await prisma.roles.findUnique({
      where: { id },
      include: {
        role_permissions: {
          include: {
            permissions: true
          }
        },
        users: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      }
    });
  }
  async createRole(data) {
    return await prisma.roles.create({
      data: {
        id: randomUUID(),
        name: data.name,
        description: data.description,
        is_system: false,
        updatedAt: /* @__PURE__ */ new Date()
      }
    });
  }
  async updateRole(id, data) {
    return await prisma.roles.update({
      where: { id },
      data
    });
  }
  async deleteRole(id) {
    const role = await prisma.roles.findUnique({ where: { id } });
    if (role?.is_system) {
      throw new Error("No se pueden eliminar roles del sistema");
    }
    return await prisma.roles.delete({ where: { id } });
  }
  async getAllPermissions() {
    return await prisma.permissions.findMany({
      orderBy: [
        { resource: "asc" },
        { action: "asc" }
      ]
    });
  }
  async assignPermissionsToRole(roleId, permissionIds) {
    await prisma.role_permissions.deleteMany({
      where: { roleId }
    });
    if (permissionIds.length > 0) {
      await prisma.role_permissions.createMany({
        data: permissionIds.map((permissionId) => ({
          id: randomUUID(),
          roleId,
          permissionId
        })),
        skipDuplicates: true
      });
    }
    return await this.getRoleById(roleId);
  }
  async getUserPermissions(userId) {
    const user = await prisma.users.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role_permissions: {
              include: {
                permissions: true
              }
            }
          }
        }
      }
    });
    if (!user?.roles) {
      return [];
    }
    return user.roles.role_permissions.map((rp) => rp.permissions);
  }
  async hasPermission(userId, resource, action) {
    const permissions = await this.getUserPermissions(userId);
    return permissions.some((p) => p.resource === resource && p.action === action);
  }
  // ==================== SYSTEM SETTINGS ====================
  async getSystemSettings() {
    const settings = await prisma.system_settings.findFirst();
    if (!settings) return void 0;
    return {
      id: settings.id,
      registrationEnabled: settings.registrationEnabled,
      updatedAt: settings.updatedAt
    };
  }
  async updateSystemSettings(data) {
    let settings = await prisma.system_settings.findFirst();
    if (!settings) {
      settings = await prisma.system_settings.create({
        data: {
          registrationEnabled: data?.registration_enabled ?? true
        }
      });
    } else {
      settings = await prisma.system_settings.update({
        where: { id: settings.id },
        data
      });
    }
    return {
      id: settings.id,
      registrationEnabled: settings.registrationEnabled,
      updatedAt: settings.updatedAt
    };
  }
  // ==================== SMTP ACCOUNTS ====================
  mapSMTPAccount(account) {
    if (!account) return null;
    return {
      id: account.id,
      nombre: account.nombre,
      host: account.host,
      port: account.port,
      user: account.user,
      password: decryptPassword(account.password),
      isPredeterminada: account.is_predeterminada,
      activa: account.activa,
      creadaPor: account.creada_por,
      fechaCreacion: account.fecha_creacion
    };
  }
  async getSMTPAccount(id) {
    const account = await prisma.smtp_accounts.findUnique({ where: { id } });
    return this.mapSMTPAccount(account);
  }
  async getAllSMTPAccounts() {
    const accounts = await prisma.smtp_accounts.findMany({
      orderBy: { fecha_creacion: "desc" }
    });
    return accounts.map((account) => this.mapSMTPAccount(account));
  }
  async getDefaultSMTPAccount() {
    const account = await prisma.smtp_accounts.findFirst({
      where: { is_predeterminada: true, activa: true }
    });
    return this.mapSMTPAccount(account);
  }
  async createSMTPAccount(account) {
    const portValue = typeof account.port === "string" ? parseInt(account.port, 10) : account.port;
    const encryptedAccount = {
      id: randomUUID(),
      nombre: account.nombre,
      host: account.host,
      port: portValue,
      user: account.user,
      password: encryptPassword(account.password),
      is_predeterminada: account.isPredeterminada ?? false,
      activa: account.activa ?? true,
      creada_por: account.creadaPor ?? null
    };
    const createdAccount = await prisma.$transaction(async (tx) => {
      if (encryptedAccount.is_predeterminada) {
        await tx.smtp_accounts.updateMany({
          where: { is_predeterminada: true },
          data: { is_predeterminada: false }
        });
      }
      return await tx.smtp_accounts.create({ data: encryptedAccount });
    });
    return this.mapSMTPAccount(createdAccount);
  }
  async updateSMTPAccount(id, account) {
    const updateData = {};
    if (account.nombre !== void 0) updateData.nombre = account.nombre;
    if (account.host !== void 0) updateData.host = account.host;
    if (account.port !== void 0) {
      updateData.port = typeof account.port === "string" ? parseInt(account.port, 10) : account.port;
    }
    if (account.user !== void 0) updateData.user = account.user;
    if (account.password) {
      updateData.password = encryptPassword(account.password);
    }
    if (account.isPredeterminada !== void 0) {
      updateData.is_predeterminada = account.isPredeterminada;
    }
    if (account.activa !== void 0) {
      updateData.activa = account.activa;
    }
    if (account.creadaPor !== void 0) {
      updateData.creada_por = account.creadaPor;
    }
    const updatedAccount = await prisma.$transaction(async (tx) => {
      if (updateData.is_predeterminada) {
        await tx.smtp_accounts.updateMany({
          where: { is_predeterminada: true, id: { not: id } },
          data: { is_predeterminada: false }
        });
      }
      return await tx.smtp_accounts.update({
        where: { id },
        data: updateData
      });
    });
    return this.mapSMTPAccount(updatedAccount);
  }
  async deleteSMTPAccount(id) {
    await prisma.smtp_accounts.delete({ where: { id } });
    return true;
  }
  // ==================== NOTIFICATION TEMPLATES ====================
  async getNotificationTemplate(id) {
    return await prisma.notification_templates.findUnique({ where: { id } });
  }
  async getAllNotificationTemplates() {
    return await prisma.notification_templates.findMany({
      orderBy: { fecha_creacion: "desc" },
      include: { users: { select: { username: true } } }
    });
  }
  async createNotificationTemplate(template) {
    return await prisma.notification_templates.create({ data: template });
  }
  async updateNotificationTemplate(id, template) {
    return await prisma.notification_templates.update({
      where: { id },
      data: template
    });
  }
  async deleteNotificationTemplate(id) {
    await prisma.notification_templates.delete({ where: { id } });
    return true;
  }
  // ==================== NOTIFICATION LOGS ====================
  async getNotificationLog(id) {
    return await prisma.notification_logs.findUnique({
      where: { id },
      include: {
        notification_templates: true,
        smtp_accounts: true,
        users: { select: { username: true } }
      }
    });
  }
  async getAllNotificationLogs() {
    return await prisma.notification_logs.findMany({
      orderBy: { fecha_envio: "desc" },
      include: {
        notification_templates: { select: { nombre: true } },
        smtp_accounts: { select: { nombre: true } },
        users: { select: { username: true } }
      }
    });
  }
  async createNotificationLog(log2) {
    return await prisma.notification_logs.create({ data: log2 });
  }
  // ==================== SCHEDULED NOTIFICATIONS ====================
  async getScheduledNotification(id) {
    return await prisma.scheduled_notifications.findUnique({
      where: { id },
      include: {
        notification_templates: true,
        smtp_accounts: true,
        users: { select: { username: true } }
      }
    });
  }
  async getAllScheduledNotifications() {
    return await prisma.scheduled_notifications.findMany({
      orderBy: { fecha_programada: "asc" },
      include: {
        notification_templates: { select: { nombre: true } },
        smtp_accounts: { select: { nombre: true } },
        users: { select: { username: true } }
      }
    });
  }
  async getPendingScheduledNotifications() {
    return await prisma.scheduled_notifications.findMany({
      where: {
        estado: "PENDIENTE",
        fecha_programada: { lte: /* @__PURE__ */ new Date() }
      },
      include: {
        notification_templates: true,
        smtp_accounts: true
      }
    });
  }
  async createScheduledNotification(notification) {
    return await prisma.scheduled_notifications.create({ data: notification });
  }
  async updateScheduledNotification(id, notification) {
    return await prisma.scheduled_notifications.update({
      where: { id },
      data: notification
    });
  }
  async deleteScheduledNotification(id) {
    await prisma.scheduled_notifications.delete({ where: { id } });
    return true;
  }
};
var prismaStorage = new PrismaStorage();

// server/routes.ts
import { PrismaClient as PrismaClient20 } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt3 from "jsonwebtoken";
import { randomUUID as randomUUID9 } from "crypto";

// server/utils/validators.ts
import { z } from "zod";
var CLIENT_TYPE_VALUES = [...CLIENT_TYPES];
var PERIODICITY_VALUES = [...TAX_PERIODICITIES];
var normalizeOptionalString = (maxLength) => z.preprocess(
  (value) => {
    if (value === null) {
      return null;
    }
    if (typeof value !== "string") {
      return value;
    }
    const trimmed = value.trim();
    return trimmed === "" ? void 0 : trimmed;
  },
  (maxLength ? z.string().max(maxLength) : z.string()).or(z.null()).optional()
);
var clientTypeSchema = z.string().min(1).transform((value) => value.trim().toUpperCase()).refine((value) => CLIENT_TYPES.includes(value), {
  message: `Tipo de cliente inv\xE1lido. Valores permitidos: ${CLIENT_TYPES.join(", ")}`
});
var periodicitySchema = z.string().min(1).transform((value) => value.trim().toUpperCase()).refine((value) => TAX_PERIODICITIES.includes(value), {
  message: `Periodicidad inv\xE1lida. Valores permitidos: ${TAX_PERIODICITIES.join(", ")}`
});
var dateStringSchema = z.string().min(1, { message: "La fecha es obligatoria" }).refine((value) => !Number.isNaN(Date.parse(value)), { message: "Fecha inv\xE1lida" });
var registerSchema = z.object({
  username: z.string().min(3, "El usuario debe tener al menos 3 caracteres").trim(),
  email: z.string().email("Email inv\xE1lido"),
  password: z.string().min(6, "La contrase\xF1a debe tener al menos 6 caracteres"),
  roleId: z.string().optional()
});
var userCreateSchema = z.object({
  username: z.string().min(3).trim(),
  email: z.string().email(),
  password: z.string().min(6),
  roleId: z.string().optional()
});
var smtpConfigSchema = z.object({
  host: z.string().min(1).max(200),
  port: z.union([z.string(), z.number()]).transform((val) => typeof val === "string" ? parseInt(val, 10) : val).refine((n) => Number.isFinite(n) && n > 0 && n <= 65535, { message: "Puerto SMTP inv\xE1lido" }),
  user: z.string().min(1),
  pass: z.string().min(1)
});
var smtpAccountSchema = z.object({
  nombre: z.string().min(1),
  host: z.string().min(1).max(200),
  port: z.union([z.string(), z.number()]).transform((val) => typeof val === "string" ? parseInt(val, 10) : val).refine((n) => Number.isFinite(n) && n > 0 && n <= 65535),
  user: z.string().min(1),
  password: z.string().min(1),
  isPredeterminada: z.boolean().optional(),
  activa: z.boolean().optional()
});
var githubConfigSchema = z.object({
  repoUrl: z.string().min(1).max(500)
});
var clientBaseSchema = z.object({
  razonSocial: z.string().trim().min(1, "La raz\xF3n social es obligatoria"),
  nifCif: z.string().trim().min(1, "El NIF/CIF es obligatorio"),
  tipo: clientTypeSchema,
  email: normalizeOptionalString().refine(
    (value) => !value || z.string().email().safeParse(value).success,
    "Email inv\xE1lido"
  ),
  telefono: normalizeOptionalString(50),
  direccion: normalizeOptionalString(255),
  responsableAsignado: normalizeOptionalString(),
  isActive: z.boolean().optional(),
  fechaAlta: normalizeOptionalString(),
  fechaBaja: normalizeOptionalString(),
  notes: normalizeOptionalString()
});
var clientCreateSchema = clientBaseSchema.extend({
  responsableAsignado: normalizeOptionalString()
});
var clientUpdateSchema = clientBaseSchema.partial();
var taxAssignmentShape = z.object({
  taxModelCode: z.string().trim().min(1, "El c\xF3digo de modelo es obligatorio"),
  periodicity: periodicitySchema,
  startDate: dateStringSchema,
  endDate: normalizeOptionalString(),
  activeFlag: z.boolean().optional(),
  notes: normalizeOptionalString()
});
var validateTaxAssignmentDates = (data, ctx) => {
  if (data.endDate) {
    const start = data.startDate ? Date.parse(data.startDate) : NaN;
    const end = Date.parse(data.endDate);
    if (Number.isNaN(end)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "Fecha de baja inv\xE1lida"
      });
    } else if (!Number.isNaN(start) && end < start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "La fecha de baja debe ser posterior a la fecha de alta"
      });
    }
  }
};
var taxAssignmentCreateSchema = taxAssignmentShape.superRefine(
  (data, ctx) => validateTaxAssignmentDates({ startDate: data.startDate, endDate: data.endDate ?? void 0 }, ctx)
);
var taxAssignmentUpdateSchema = taxAssignmentShape.partial().superRefine(
  (data, ctx) => validateTaxAssignmentDates(
    { startDate: data.startDate, endDate: data.endDate ?? void 0 },
    ctx
  )
);
var taskCreateSchema = z.object({
  titulo: z.string().min(1),
  descripcion: z.string().optional(),
  fechaVencimiento: z.string().optional(),
  asignadoA: z.string().optional(),
  clienteId: z.string().optional(),
  visibilidad: z.string().optional()
});
function validateTaxAssignmentAgainstRules(clientType, payload) {
  validateTaxAssignmentInput({
    clientType,
    taxModelCode: payload.taxModelCode,
    periodicity: payload.periodicity
  });
  const enforce303Monthly = String(process.env.ENFORCE_303_MONTHLY || "").toLowerCase() === "true";
  if (enforce303Monthly && payload.taxModelCode === "303" && payload.periodicity !== "MENSUAL") {
    throw new Error("El modelo 303 debe configurarse como MENSUAL (pol\xEDtica vigente)");
  }
}
function validateZod(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.errors.map((e) => ({
        path: e.path.join("."),
        message: e.message
      }));
      return res.status(400).json({ errors });
    }
    req.body = result.data;
    return next();
  };
}

// server/routes.ts
import multer3 from "multer";
import path13 from "path";
import fs10 from "fs";

// server/email.ts
import nodemailer from "nodemailer";
var smtpConfig = null;
function configureSMTP(config) {
  smtpConfig = config ? { ...config } : null;
}
function getSMTPConfig() {
  return smtpConfig;
}
function createTransporter() {
  if (!smtpConfig) {
    console.warn("SMTP not configured, skipping email");
    return null;
  }
  return nodemailer.createTransport({
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: smtpConfig.port === 465,
    auth: {
      user: smtpConfig.user,
      pass: smtpConfig.pass
    }
  });
}
async function sendTaskReminderEmail(task, daysUntilDue) {
  const transporter2 = createTransporter();
  if (!transporter2 || !task.assignedUser?.email || !smtpConfig) return;
  const subject = `Recordatorio: Tarea "${task.titulo}" vence en ${daysUntilDue} d\xEDas`;
  const html = `
    <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1E3A8A;">Recordatorio de Tarea</h2>
      <p>Hola ${task.assignedUser.username},</p>
      <p>Te recordamos que tienes una tarea pendiente que vence pronto:</p>
      
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0;">${task.titulo}</h3>
        ${task.descripcion ? `<p>${task.descripcion}</p>` : ""}
        <p><strong>Prioridad:</strong> ${task.prioridad}</p>
        <p><strong>Vencimiento:</strong> ${task.fechaVencimiento ? new Date(task.fechaVencimiento).toLocaleDateString("es-ES") : "No definido"}</p>
        <p><strong>D\xEDas restantes:</strong> ${daysUntilDue}</p>
      </div>
      
      <p>Por favor, aseg\xFArate de completar esta tarea a tiempo.</p>
      <p>Saludos,<br>Asesor\xEDa La Llave</p>
    </div>
  `;
  try {
    await transporter2.sendMail({
      from: smtpConfig.user,
      to: task.assignedUser.email,
      subject,
      html
    });
    console.log(`Email sent to ${task.assignedUser.email} for task ${task.id}`);
  } catch (error) {
    console.error("Error sending task reminder email:", error);
  }
}
async function sendTaxReminderEmail(clientTax, daysUntilDue) {
  const transporter2 = createTransporter();
  if (!transporter2 || !clientTax.client?.email || !smtpConfig) return;
  const modelName = clientTax.taxPeriod?.taxModel?.nombre || "Modelo fiscal";
  const period = clientTax.taxPeriod ? `${clientTax.taxPeriod.trimestre ? `T${clientTax.taxPeriod.trimestre}` : clientTax.taxPeriod.mes ? `Mes ${clientTax.taxPeriod.mes}` : ""} ${clientTax.taxPeriod.anio}` : "Periodo no especificado";
  const subject = `Recordatorio: ${modelName} vence en ${daysUntilDue} d\xEDas`;
  const html = `
    <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1E3A8A;">Recordatorio de Impuesto</h2>
      <p>Estimado cliente ${clientTax.client.razonSocial},</p>
      <p>Le recordamos que tiene un modelo fiscal pendiente que vence pronto:</p>
      
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0;">${modelName}</h3>
        <p><strong>Periodo:</strong> ${period}</p>
        <p><strong>Estado:</strong> ${clientTax.estado}</p>
        <p><strong>Fecha l\xEDmite:</strong> ${clientTax.taxPeriod?.finPresentacion ? new Date(clientTax.taxPeriod.finPresentacion).toLocaleDateString("es-ES") : "No definida"}</p>
        <p><strong>D\xEDas restantes:</strong> ${daysUntilDue}</p>
        ${clientTax.notas ? `<p><strong>Notas:</strong> ${clientTax.notas}</p>` : ""}
      </div>
      
      <p>Por favor, aseg\xFArese de presentar este modelo antes de la fecha l\xEDmite para evitar sanciones.</p>
      <p>Atentamente,<br>Asesor\xEDa La Llave</p>
    </div>
  `;
  try {
    await transporter2.sendMail({
      from: smtpConfig.user,
      to: clientTax.client.email,
      subject,
      html
    });
    console.log(`Email sent to ${clientTax.client.email} for tax ${clientTax.id}`);
  } catch (error) {
    console.error("Error sending tax reminder email:", error);
  }
}
async function checkAndSendReminders(storage2) {
  const now = /* @__PURE__ */ new Date();
  const tasks = await storage2.getAllTasks();
  for (const task of tasks) {
    if (task.fechaVencimiento && task.estado !== "COMPLETADA" && task.asignadoA) {
      const dueDate = new Date(task.fechaVencimiento);
      const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1e3 * 60 * 60 * 24));
      if (daysUntilDue === 3) {
        const assignedUser = await storage2.getUser(task.asignadoA);
        if (assignedUser) {
          await sendTaskReminderEmail({ ...task, assignedUser }, daysUntilDue);
        }
      }
    }
  }
  const clientTaxes = await storage2.getAllClientTax();
  for (const clientTax of clientTaxes) {
    if (clientTax.estado !== "REALIZADO") {
      const taxPeriod = await storage2.getTaxPeriod(clientTax.taxPeriodId);
      if (taxPeriod?.finPresentacion) {
        const dueDate = new Date(taxPeriod.finPresentacion);
        const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1e3 * 60 * 60 * 24));
        if (daysUntilDue === 7) {
          const client = await storage2.getClient(clientTax.clientId);
          const taxModel = await storage2.getTaxModel(taxPeriod.modeloId);
          if (client) {
            await sendTaxReminderEmail({
              ...clientTax,
              client,
              taxPeriod: { ...taxPeriod, taxModel }
            }, daysUntilDue);
          }
        }
      }
    }
  }
}

// server/websocket.ts
var io = null;
function setSocketIO(socketIO) {
  io = socketIO;
}
function getSocketIO() {
  return io;
}
function getSocketServer() {
  return getSocketIO();
}
function notifyUser(userId, notification) {
  if (!io) {
    console.warn("Socket.IO no est\xE1 inicializado");
    return;
  }
  io.to(`user:${userId}`).emit("notification", {
    ...notification,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
}
function notifyRole(role, notification) {
  if (!io) {
    console.warn("Socket.IO no est\xE1 inicializado");
    return;
  }
  io.to(`role:${role}`).emit("notification", {
    ...notification,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
}
function notifyAll(notification) {
  if (!io) {
    console.warn("Socket.IO no est\xE1 inicializado");
    return;
  }
  io.emit("notification", {
    ...notification,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
}
function notifyTaskChange(action, task, userId) {
  const notification = {
    type: "task",
    action,
    title: `Tarea ${action === "created" ? "creada" : action === "updated" ? "actualizada" : "eliminada"}`,
    message: `La tarea "${task.titulo}" ha sido ${action === "created" ? "creada" : action === "updated" ? "actualizada" : "eliminada"}`,
    data: task
  };
  if (userId) {
    notifyUser(userId, notification);
  } else if (task.asignadoA) {
    notifyUser(task.asignadoA, notification);
  } else {
    notifyAll(notification);
  }
}
function notifyTaxChange(action, clientTax, userId) {
  const notification = {
    type: "tax",
    action,
    title: `Impuesto ${action === "created" ? "asignado" : action === "updated" ? "actualizado" : "eliminado"}`,
    message: `Un impuesto ha sido ${action === "created" ? "asignado" : action === "updated" ? "actualizado" : "eliminado"}`,
    data: clientTax
  };
  if (userId) {
    notifyUser(userId, notification);
  } else {
    notifyRole("ADMIN", notification);
    notifyRole("GESTOR", notification);
  }
}
function notifyClientChange(action, client) {
  const notification = {
    type: "client",
    action,
    title: `Cliente ${action === "created" ? "creado" : action === "updated" ? "actualizado" : "eliminado"}`,
    message: `El cliente "${client.razonSocial}" ha sido ${action === "created" ? "creado" : action === "updated" ? "actualizado" : "eliminado"}`,
    data: client
  };
  notifyRole("ADMIN", notification);
  notifyRole("GESTOR", notification);
}

// server/admin-sessions.ts
import express from "express";
import { PrismaClient as PrismaClient2 } from "@prisma/client";

// server/middleware/auth.ts
import jwt from "jsonwebtoken";
if (!process.env.JWT_SECRET) {
  throw new Error("FATAL: JWT_SECRET no est\xE1 configurado. Este valor es OBLIGATORIO para la seguridad del sistema.");
}
var JWT_SECRET = process.env.JWT_SECRET;
var authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && String(authHeader).split(" ")[1];
    if (!token) return res.status(401).json({ error: "Token no proporcionado" });
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded || !decoded.id) return res.status(403).json({ error: "Token inv\xE1lido" });
    const user = await prismaStorage.getUserWithPermissions(decoded.id);
    if (!user) return res.status(401).json({ error: "Usuario no encontrado" });
    const permissions = (user.roles?.role_permissions || []).map((rp) => `${rp.permissions.resource}:${rp.permissions.action}`);
    req.user = {
      id: user.id,
      username: user.username,
      roleId: user.roleId,
      roleName: user.roles?.name || null,
      permissions
    };
    next();
  } catch (err) {
    return res.status(403).json({ error: "Token inv\xE1lido" });
  }
};
var checkIsAdmin = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: "Usuario no autenticado" });
  if (req.user.roleName === "Administrador" || req.user.permissions.includes("admin:read") || req.user.permissions.includes("admin:settings")) {
    return next();
  }
  return res.status(403).json({ error: "No tienes permisos de administrador" });
};

// server/admin-sessions.ts
var prisma2 = new PrismaClient2();
var router = express.Router();
router.get("/", authenticateToken, checkIsAdmin, async (req, res) => {
  try {
    const { page = 1, size = 50, activeOnly, query, country, device, vpnOnly, suspicious } = req.query;
    const where = {};
    if (activeOnly === "true" || activeOnly === void 0) {
      where.ended_at = null;
    }
    if (query) {
      where.OR = [
        { ip: { contains: query } },
        { users: { username: { contains: query } } },
        { users: { email: { contains: query } } },
        { user_agent: { contains: query } }
      ];
    }
    if (country) where.country = country;
    if (device) where.device_type = device;
    if (vpnOnly === "true") where.isVpn = true;
    if (suspicious === "true") where.suspicious = true;
    const take = Number(size) || 50;
    const skip = (Number(page) - 1) * take;
    console.log("\u{1F50D} Buscando sesiones con filtros:", { where, activeOnly, page, size });
    const p = prisma2;
    const [items, total] = await Promise.all([
      p.sessions.findMany({
        where,
        include: {
          users: {
            select: {
              id: true,
              username: true,
              email: true,
              roles: {
                select: {
                  name: true
                }
              }
            }
          }
        },
        orderBy: { last_seen_at: "desc" },
        take,
        skip
      }),
      p.sessions.count({ where })
    ]);
    console.log(`\u{1F4CA} Encontradas ${items.length} sesiones de ${total} total`);
    const enrichedItems = items.map((session) => {
      const now = /* @__PURE__ */ new Date();
      const lastSeen = new Date(session.last_seen_at);
      const minutesSinceLastSeen = Math.floor((now.getTime() - lastSeen.getTime()) / (1e3 * 60));
      return {
        ...session,
        isActive: !session.ended_at && minutesSinceLastSeen < 5,
        // Activo si se vio en los últimos 5 minutos
        minutesSinceLastSeen,
        status: session.ended_at ? "closed" : minutesSinceLastSeen < 5 ? "active" : "idle",
        deviceInfo: {
          type: session.device_type || "Unknown",
          platform: session.platform || "Unknown",
          userAgent: session.user_agent?.substring(0, 100) + (session.user_agent?.length > 100 ? "..." : "")
        },
        location: {
          country: session.country || "Unknown",
          region: session.region || "Unknown",
          city: session.city || "Unknown",
          isVpn: session.isVpn || false
        }
      };
    });
    res.json({ items: enrichedItems, total, page: Number(page), size: take });
  } catch (err) {
    console.error("GET /api/admin/sessions error", err);
    res.status(500).json({ error: "Internal error" });
  }
});
router.get("/:id", authenticateToken, checkIsAdmin, async (req, res) => {
  try {
    const p = prisma2;
    const session = await p.sessions.findUnique({ where: { id: req.params.id }, include: { users: true } });
    if (!session) return res.status(404).json({ error: "Not found" });
    res.json(session);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error" });
  }
});
router.post("/:id/terminate", authenticateToken, checkIsAdmin, async (req, res) => {
  try {
    console.log(`\u{1F50C} Intentando terminar sesi\xF3n ${req.params.id} por administrador ${req.user?.username}`);
    const p = prisma2;
    const session = await p.sessions.findUnique({
      where: { id: req.params.id },
      include: { users: { select: { username: true } } }
    });
    if (!session) {
      console.log(`\u274C Sesi\xF3n ${req.params.id} no encontrada`);
      return res.status(404).json({ error: "Sesi\xF3n no encontrada" });
    }
    console.log(`\u{1F4CB} Sesi\xF3n encontrada: ${session.users?.username} (${session.socketId})`);
    await p.sessions.update({ where: { id: req.params.id }, data: { ended_at: /* @__PURE__ */ new Date() } });
    console.log(`\u2705 Sesi\xF3n ${req.params.id} marcada como terminada en BD`);
    const io2 = getSocketServer();
    if (io2 && session.socketId) {
      const sock = io2.sockets.sockets.get(session.socketId);
      if (sock) {
        console.log(`\u{1F50C} Socket encontrado, enviando notificaci\xF3n y desconectando...`);
        sock.emit("session:terminated", {
          reason: "admin_terminated",
          message: "Tu sesi\xF3n ha sido terminada por un administrador"
        });
        sock.disconnect(true);
        console.log(`\u2705 Socket ${session.socketId} desconectado exitosamente`);
      } else {
        console.log(`\u26A0\uFE0F Socket ${session.socketId} no encontrado en servidor`);
      }
    } else {
      console.log(`\u26A0\uFE0F No hay socket ID o servidor IO no disponible`);
    }
    if (io2) {
      io2.to("role:Administrador").emit("session:disconnected", {
        id: req.params.id,
        userId: session.userId,
        terminatedBy: req.user?.username
      });
      console.log(`\u{1F4E2} Notificaci\xF3n enviada a administradores`);
    }
    console.log(`\u2705 Sesi\xF3n ${req.params.id} terminada completamente por administrador ${req.user?.username}`);
    res.json({ ok: true, message: "Sesi\xF3n terminada exitosamente" });
  } catch (err) {
    console.error("\u274C Error terminando sesi\xF3n:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});
router.post("/:id/flag", authenticateToken, checkIsAdmin, async (req, res) => {
  try {
    const p = prisma2;
    const session = await p.sessions.update({ where: { id: req.params.id }, data: { suspicious: true } });
    const io2 = getSocketServer();
    if (io2) io2.to("admins").emit("session:update", session);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error" });
  }
});
router.post("/:id/unflag", authenticateToken, checkIsAdmin, async (req, res) => {
  try {
    const p = prisma2;
    const session = await p.sessions.update({ where: { id: req.params.id }, data: { suspicious: false } });
    const io2 = getSocketServer();
    if (io2) io2.to("admins").emit("session:update", session);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error" });
  }
});
router.post("/terminate-all-for-user/:userId", authenticateToken, checkIsAdmin, async (req, res) => {
  try {
    const p = prisma2;
    const userId = req.params.userId;
    const activeSessions = await p.sessions.findMany({
      where: { userId, ended_at: null }
    });
    await p.sessions.updateMany({
      where: { userId, ended_at: null },
      data: { ended_at: /* @__PURE__ */ new Date() }
    });
    const io2 = getSocketServer();
    if (io2) {
      activeSessions.forEach((session) => {
        if (session.socketId) {
          const sock = io2.sockets.sockets.get(session.socketId);
          if (sock) {
            sock.disconnect(true);
          }
        }
      });
      io2.to("admins").emit("sessions:terminated", {
        userId,
        count: activeSessions.length
      });
    }
    res.json({ ok: true, terminatedCount: activeSessions.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error" });
  }
});
router.get("/stats", authenticateToken, checkIsAdmin, async (req, res) => {
  try {
    const p = prisma2;
    const [
      totalSessions,
      activeSessions,
      suspiciousSessions,
      vpnSessions,
      sessionsByCountry,
      sessionsByDevice
    ] = await Promise.all([
      p.sessions.count(),
      p.sessions.count({ where: { ended_at: null } }),
      p.sessions.count({ where: { suspicious: true } }),
      p.sessions.count({ where: { isVpn: true } }),
      p.sessions.groupBy({
        by: ["country"],
        _count: { country: true },
        where: { ended_at: null },
        orderBy: { _count: { country: "desc" } },
        take: 10
      }),
      p.sessions.groupBy({
        by: ["device_type"],
        _count: { device_type: true },
        where: { ended_at: null },
        orderBy: { _count: { device_type: "desc" } },
        take: 10
      })
    ]);
    res.json({
      totalSessions,
      activeSessions,
      suspiciousSessions,
      vpnSessions,
      sessionsByCountry,
      sessionsByDevice
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error" });
  }
});
router.post("/cleanup", authenticateToken, checkIsAdmin, async (req, res) => {
  try {
    const p = prisma2;
    const closedSessionsResult = await p.sessions.deleteMany({
      where: {
        ended_at: { not: null }
      }
    });
    const thirtyMinutesAgo = /* @__PURE__ */ new Date();
    thirtyMinutesAgo.setMinutes(thirtyMinutesAgo.getMinutes() - 30);
    const inactiveSessionsResult = await p.sessions.updateMany({
      where: {
        ended_at: null,
        last_seen_at: { lt: thirtyMinutesAgo }
      },
      data: {
        ended_at: /* @__PURE__ */ new Date()
      }
    });
    console.log(`\u{1F9F9} Limpieza manual: ${closedSessionsResult.count} sesiones cerradas eliminadas, ${inactiveSessionsResult.count} sesiones inactivas marcadas como cerradas`);
    res.json({
      ok: true,
      deletedCount: closedSessionsResult.count,
      markedInactiveCount: inactiveSessionsResult.count,
      totalCleaned: closedSessionsResult.count + inactiveSessionsResult.count
    });
  } catch (err) {
    console.error("Error en limpieza de sesiones:", err);
    res.status(500).json({ error: "Internal error" });
  }
});
router.get("/all", authenticateToken, checkIsAdmin, async (req, res) => {
  try {
    const { page = 1, size = 50, query, country, device, vpnOnly, suspicious } = req.query;
    const where = {};
    if (query) {
      where.OR = [
        { ip: { contains: query } },
        { users: { username: { contains: query } } },
        { users: { email: { contains: query } } },
        { user_agent: { contains: query } }
      ];
    }
    if (country) where.country = country;
    if (device) where.device_type = device;
    if (vpnOnly === "true") where.isVpn = true;
    if (suspicious === "true") where.suspicious = true;
    const take = Number(size) || 50;
    const skip = (Number(page) - 1) * take;
    console.log("\u{1F50D} Buscando TODAS las sesiones con filtros:", { where, page, size });
    const p = prisma2;
    const [items, total] = await Promise.all([
      p.sessions.findMany({
        where,
        include: {
          users: {
            select: {
              id: true,
              username: true,
              email: true,
              role: {
                select: {
                  name: true
                }
              }
            }
          }
        },
        orderBy: { last_seen_at: "desc" },
        take,
        skip
      }),
      p.sessions.count({ where })
    ]);
    console.log(`\u{1F4CA} Encontradas ${items.length} sesiones de ${total} total (todas)`);
    const enrichedItems = items.map((session) => {
      const now = /* @__PURE__ */ new Date();
      const lastSeen = new Date(session.last_seen_at);
      const minutesSinceLastSeen = Math.floor((now.getTime() - lastSeen.getTime()) / (1e3 * 60));
      return {
        ...session,
        isActive: !session.ended_at && minutesSinceLastSeen < 5,
        minutesSinceLastSeen,
        status: session.ended_at ? "closed" : minutesSinceLastSeen < 5 ? "active" : "idle",
        deviceInfo: {
          type: session.device_type || "Unknown",
          platform: session.platform || "Unknown",
          userAgent: session.user_agent?.substring(0, 100) + (session.user_agent?.length > 100 ? "..." : "")
        },
        location: {
          country: session.country || "Unknown",
          region: session.region || "Unknown",
          city: session.city || "Unknown",
          isVpn: session.isVpn || false
        }
      };
    });
    res.json({ items: enrichedItems, total, page: Number(page), size: take });
  } catch (err) {
    console.error("GET /api/admin/sessions/all error", err);
    res.status(500).json({ error: "Internal error" });
  }
});
var admin_sessions_default = router;

// server/price-catalog.ts
import express2 from "express";
import { PrismaClient as PrismaClient3 } from "@prisma/client";
var prisma3 = new PrismaClient3();
var router2 = express2.Router();
router2.get("/", authenticateToken, async (req, res) => {
  try {
    const p = prisma3;
    const items = await p.priceCatalog.findMany({ where: { active: true }, orderBy: { title: "asc" } });
    res.json(items);
  } catch (err) {
    console.error("GET /api/price-catalog", err);
    res.status(500).json({ error: err.message });
  }
});
router2.post("/", authenticateToken, checkIsAdmin, async (req, res) => {
  try {
    const { key, title, unit, basePrice, vatPct, active } = req.body;
    const p = prisma3;
    const item = await p.priceCatalog.create({ data: { key, title, unit, basePrice: Number(basePrice), vatPct: Number(vatPct || 21), active: active ?? true } });
    res.status(201).json(item);
  } catch (err) {
    console.error("POST /api/price-catalog", err);
    res.status(500).json({ error: err.message });
  }
});
router2.patch("/:id", authenticateToken, checkIsAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    if (updates.basePrice !== void 0) updates.basePrice = Number(updates.basePrice);
    if (updates.vatPct !== void 0) updates.vatPct = Number(updates.vatPct);
    const p = prisma3;
    const updated = await p.priceCatalog.update({ where: { id }, data: updates });
    res.json(updated);
  } catch (err) {
    console.error("PATCH /api/price-catalog/:id", err);
    res.status(500).json({ error: err.message });
  }
});
var price_catalog_default = router2;

// server/budgets.ts
init_prisma_client();
import express3 from "express";

// server/utils/budgets-pdf.ts
import path from "path";
import fs from "fs";
import puppeteer from "puppeteer";
import { PrismaClient as PrismaClient5 } from "@prisma/client";

// server/utils/template-variables.ts
function replaceTemplateVariables(htmlContent, data) {
  let result = htmlContent;
  Object.entries(data).forEach(([key, value]) => {
    if (value !== void 0 && value !== null) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, "gi");
      result = result.replace(regex, String(value));
    }
  });
  result = result.replace(/{{([^}]+)}}/g, '<span style="color: red; font-style: italic;">[$1 no disponible]</span>');
  return result;
}
function formatCurrency(value) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR"
  }).format(value);
}
function formatDate(date) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}
function prepareBudgetData(budget) {
  const data = {
    codigo: budget.code || "",
    fecha: formatDate(new Date(budget.createdAt)),
    nombre_contacto: budget.contactName || "",
    email: budget.contactEmail || "",
    telefono: budget.contactPhone || "",
    subtotal: formatCurrency(budget.subtotal || 0),
    iva: formatCurrency(budget.iva || 0),
    total: formatCurrency(budget.total || 0),
    empresa: budget.companyBrand === "LA_LLAVE" ? "Asesor\xEDa La Llave" : "Gestor\xEDa Online",
    descripcion: budget.description || ""
  };
  if (budget.type === "PYME" && budget.details) {
    data.nombre_sociedad = budget.details.companyName || "";
    data.actividad = budget.details.activity || "";
    data.periodo_declaraciones = budget.details.declarationPeriod || "";
    data.num_asientos = String(budget.details.numEntries || 0);
    data.nominas_mes = String(budget.details.payrollsPerMonth || 0);
  }
  if (budget.type === "AUTONOMO" && budget.details) {
    data.sistema_tributacion = budget.details.taxationSystem || "";
    data.facturacion_anual = formatCurrency(budget.details.annualRevenue || 0);
    data.num_facturas = String(budget.details.numInvoices || 0);
  }
  if (budget.type === "RENTA" && budget.details) {
    data.tipo_declaracion = budget.details.declarationType || "";
    data.ingresos = formatCurrency(budget.details.income || 0);
    data.retenciones = formatCurrency(budget.details.withholdings || 0);
  }
  if (budget.type === "HERENCIAS" && budget.details) {
    data.titulo_sucesorio = budget.details.successionTitle || "";
    data.num_herederos = String(budget.details.numHeirs || 0);
    data.fincas_madrid = budget.details.propertiesMadrid || "";
    data.caudal = formatCurrency(budget.details.estate || 0);
    data.tipo_proceso = budget.details.processType || "";
  }
  return data;
}

// server/utils/budgets-pdf.ts
var prisma5 = new PrismaClient5();
async function createBudgetPdf(budget) {
  const uploadsDir2 = path.join(process.cwd(), "uploads", "budgets");
  if (!fs.existsSync(uploadsDir2)) fs.mkdirSync(uploadsDir2, { recursive: true });
  const filename = `${(budget.code || "budget").replace(/[^a-zA-Z0-9-_\.]/g, "_")}-${Date.now()}.pdf`;
  const filepath = path.join(uploadsDir2, filename);
  const html = await renderBudgetHtml(budget);
  let browser = null;
  try {
    browser = await puppeteer.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.pdf({ path: filepath, format: "A4", printBackground: true, margin: { top: "20mm", bottom: "20mm", left: "12mm", right: "12mm" } });
    const url = `/uploads/budgets/${filename}`;
    return { filename, url };
  } catch (err) {
    console.warn("createBudgetPdf failed, falling back to placeholder", err);
    try {
      fs.writeFileSync(filepath, Buffer.from("%PDF-1.4\n%placeholder PDF"), { encoding: "utf-8" });
      return { filename, url: `/uploads/budgets/${filename}` };
    } catch (err2) {
      throw err;
    }
  } finally {
    if (browser) await browser.close();
  }
}
async function renderBudgetHtml(budget) {
  const template = await prisma5.budget_templates.findFirst({
    where: {
      type: budget.type,
      companyBrand: budget.companyBrand || "LA_LLAVE",
      isDefault: true,
      isActive: true
    }
  });
  if (template) {
    const budgetData = prepareBudgetData(budget);
    let html = replaceTemplateVariables(template.htmlContent, budgetData);
    if (template.customCss) {
      html = `<style>${template.customCss}</style>${html}`;
    }
    if (!html.toLowerCase().includes("<!doctype") && !html.toLowerCase().includes("<html")) {
      html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
  </style>
</head>
<body>
  ${html}
</body>
</html>`;
    }
    return html;
  }
  return renderLegacyBudgetHtml(budget);
}
function renderLegacyBudgetHtml(budget) {
  const isGestoriaOnline = budget.companyBrand === "GESTORIA_ONLINE";
  const companyName = isGestoriaOnline ? "GESTOR\xCDA ONLINE" : "ASESOR\xCDA LA LLAVE";
  const companyAddress = isGestoriaOnline ? "C/ Ejemplo, 123 - 28000 Madrid" : "C/ Legan\xE9s, 17 - 28901 Getafe (Madrid)";
  const companyPhone = isGestoriaOnline ? "91 XXX XX XX" : "91 238 99 60";
  const companyEmail = isGestoriaOnline ? "info@gestoriaonline.com" : "info@asesorialallave.com";
  const companyWeb = isGestoriaOnline ? "www.gestoriaonline.com" : "www.asesorialallave.com";
  const companyColor = isGestoriaOnline ? "#1a7f64" : "#2E5C8A";
  const items = Array.isArray(budget.items) ? budget.items : [];
  const categories = /* @__PURE__ */ new Map();
  items.forEach((item) => {
    const cat = item.category || "OTROS";
    if (!categories.has(cat)) {
      categories.set(cat, []);
    }
    categories.get(cat).push(item);
  });
  const categoryNames = {
    BASE_CONTABILIDAD: "Contabilidad Base",
    BASE_HEREDEROS: "Herederos",
    BASE_FINCAS_COMUNIDAD: "Fincas Comunidad Aut\xF3noma",
    BASE_FINCAS_OTRAS: "Fincas Otras CCAA",
    BASE_PRODUCTOS: "Productos Financieros",
    BASE_VEHICULOS: "Veh\xEDculos",
    BASE_RENTA: "Declaraci\xF3n de Renta",
    SERVICIO_PLUSVALIAS: "Plusval\xEDas",
    SERVICIO_REGISTROS: "Registros",
    EXTRA_AUTONOMO: "Actividad Econ\xF3mica",
    EXTRA_INMUEBLES_ALQ: "Inmuebles Alquilados",
    EXTRA_VENTA_INMUEBLES: "Venta de Inmuebles",
    EXTRA_VENTA_FINANCIEROS: "Venta de Productos Financieros",
    EXTRA_OTRAS_GANANCIAS: "Otras Ganancias",
    EXTRA_IRPF: "IRPF Alquileres",
    EXTRA_IVA_INTRA: "IVA Intracomunitario",
    EXTRA_NOTIFICACIONES: "Notificaciones",
    EXTRA_INE: "Estad\xEDsticas INE",
    NOMINAS: "N\xF3minas",
    RECARGO_FACTURACION: "Recargo por Facturaci\xF3n",
    RECARGO_MENSUALIDAD: "Liquidaciones Mensuales",
    RECARGO_ESN: "Estimaci\xF3n Simplificada Neta",
    RECARGO_CAUDAL: "Recargo Caudal Hereditario",
    RECARGO_SIN_TESTAMENTO: "Sin Testamento",
    RECARGO_SIN_ACUERDO: "Sin Acuerdo Herederos",
    RECARGO_ESCRITURAR: "Escrituraci\xF3n",
    DESCUENTO_MODULOS: "Descuento M\xF3dulos",
    DESCUENTO_EMPRENDEDOR: "Descuento Emprendedor",
    DESCUENTO_COMERCIAL: "Descuento Comercial",
    OTROS: "Otros Conceptos"
  };
  let tableRows = "";
  categories.forEach((categoryItems, categoryKey) => {
    const categoryName = categoryNames[categoryKey] || categoryKey;
    tableRows += `
      <tr style="background-color:#E8F4FD">
        <td colspan="4" style="padding:8px 12px;border:1px solid ${companyColor};font-weight:700;color:#1a365d;font-size:11px">
          ${escapeHtml(categoryName)}
        </td>
      </tr>
    `;
    categoryItems.forEach((it) => {
      tableRows += `
        <tr>
          <td style="padding:6px 12px 6px 24px;border:1px solid ${companyColor};font-size:10px">${escapeHtml(it.concept || "")}</td>
          <td style="padding:6px 8px;border:1px solid ${companyColor};text-align:right;font-size:10px">${Number(it.quantity || 1).toFixed(0)}</td>
          <td style="padding:6px 8px;border:1px solid ${companyColor};text-align:right;font-size:10px">${Number(it.unitPrice || 0).toFixed(2)} \u20AC</td>
          <td style="padding:6px 8px;border:1px solid ${companyColor};text-align:right;font-weight:600;font-size:10px">${Number(it.total || 0).toFixed(2)} \u20AC</td>
        </tr>
      `;
    });
  });
  const typeNames = {
    PYME: "PYMES / EMPRESAS",
    AUTONOMO: "AUT\xD3NOMOS",
    RENTA: "DECLARACI\xD3N DE RENTA",
    HERENCIAS: "HERENCIAS Y DONACIONES",
    GENERAL: "GENERAL"
  };
  const typeName = typeNames[budget.type] || budget.type || "GENERAL";
  const formatDate2 = (date) => {
    const d = new Date(date || Date.now());
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };
  return `
  <!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width,initial-scale=1" />
      <style>
        @page { 
          margin: 0; 
          size: A4;
        }
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          color: #000000; 
          line-height: 1.3;
          margin: 0;
          padding: 0;
          font-size: 10px;
        }
        .page {
          padding: 15mm 12mm 15mm 12mm;
          background: white;
        }
        .header-blue { 
          background: linear-gradient(135deg, ${companyColor} 0%, ${companyColor}dd 100%);
          color: white;
          padding: 20px 25px;
          margin: -15mm -12mm 15px -12mm;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .company-name { 
          font-weight: 700; 
          font-size: 24px;
          letter-spacing: 0.5px;
          margin-bottom: 3px;
        }
        .company-info {
          font-size: 9px;
          opacity: 0.95;
          line-height: 1.4;
        }
        .budget-type {
          text-align: right;
          font-size: 16px;
          font-weight: 700;
          letter-spacing: 1px;
        }
        .budget-number {
          font-size: 11px;
          opacity: 0.9;
          margin-top: 4px;
        }
        .section-title {
          background: ${companyColor};
          color: white;
          padding: 8px 12px;
          font-weight: 700;
          font-size: 11px;
          margin: 15px 0 8px 0;
          letter-spacing: 0.3px;
        }
        .info-box {
          border: 1px solid ${companyColor};
          padding: 10px 12px;
          margin-bottom: 12px;
          background: #F8FBFE;
        }
        .info-row {
          display: flex;
          margin-bottom: 4px;
          font-size: 10px;
        }
        .info-label {
          font-weight: 600;
          width: 120px;
          color: ${companyColor};
        }
        .info-value {
          flex: 1;
          color: #000;
        }
        table { 
          border-collapse: collapse; 
          width: 100%;
          margin-bottom: 15px;
          font-size: 10px;
        }
        th {
          background: ${companyColor};
          color: white;
          padding: 8px 12px;
          text-align: left;
          font-weight: 700;
          font-size: 10px;
          border: 1px solid #1a4d7a;
        }
        td {
          border: 1px solid ${companyColor};
          padding: 6px 12px;
        }
        .totals-table {
          width: 300px;
          margin-left: auto;
          margin-top: 15px;
          border: 2px solid ${companyColor};
        }
        .totals-table td {
          padding: 8px 12px;
          font-size: 11px;
        }
        .totals-table .label {
          background: #E8F4FD;
          font-weight: 600;
          color: ${companyColor};
          width: 150px;
        }
        .totals-table .amount {
          text-align: right;
          font-weight: 700;
          background: white;
        }
        .total-final {
          background: ${companyColor} !important;
          color: white !important;
          font-size: 13px !important;
          font-weight: 700 !important;
        }
        .terms {
          margin-top: 20px;
          padding: 12px;
          border: 1px solid #CBD5E0;
          background: #F7FAFC;
          font-size: 8px;
          line-height: 1.5;
        }
        .terms-title {
          font-weight: 700;
          font-size: 9px;
          margin-bottom: 6px;
          color: ${companyColor};
          text-transform: uppercase;
        }
        .terms ul {
          margin: 6px 0;
          padding-left: 18px;
        }
        .terms li {
          margin-bottom: 3px;
        }
        .footer {
          margin-top: 20px;
          padding-top: 12px;
          border-top: 2px solid ${companyColor};
          text-align: center;
          font-size: 9px;
          color: #4A5568;
        }
        .acceptance-box {
          margin-top: 15px;
          padding: 12px;
          border: 2px solid ${companyColor};
          background: #F0F7FF;
        }
        .acceptance-title {
          font-weight: 700;
          color: ${companyColor};
          margin-bottom: 8px;
          font-size: 10px;
        }
        .signature-line {
          margin-top: 30px;
          padding-top: 8px;
          border-top: 1px solid #000;
          width: 250px;
          text-align: center;
          font-size: 9px;
        }
      </style>
    </head>
    <body>
      <div class="page">
        <!-- CABECERA AZUL -->
        <div class="header-blue">
          <div class="header-content">
            <div>
              <div class="company-name">${escapeHtml(companyName)}</div>
              <div class="company-info">
                ${escapeHtml(companyAddress)}<br>
                Tel: ${escapeHtml(companyPhone)} | Email: ${escapeHtml(companyEmail)}<br>
                ${escapeHtml(companyWeb)}
              </div>
            </div>
            <div class="budget-type">
              PRESUPUESTO<br>${typeName}
              <div class="budget-number">N\xBA ${escapeHtml(budget.code || "")}</div>
            </div>
          </div>
        </div>

        <!-- INFORMACI\xD3N DEL PRESUPUESTO -->
        <div class="info-box">
          <div class="info-row">
            <div class="info-label">Fecha Emisi\xF3n:</div>
            <div class="info-value">${formatDate2(budget.date)}</div>
          </div>
          ${budget.expiresAt ? `
          <div class="info-row">
            <div class="info-label">V\xE1lido Hasta:</div>
            <div class="info-value">${formatDate2(budget.expiresAt)}</div>
          </div>
          ` : ""}
        </div>

        <!-- DATOS DEL CLIENTE -->
        <div class="section-title">DATOS DEL CLIENTE</div>
        <div class="info-box">
          <div class="info-row">
            <div class="info-label">Cliente:</div>
            <div class="info-value"><strong>${escapeHtml(budget.clientName || "")}</strong></div>
          </div>
          ${budget.clientEmail ? `
          <div class="info-row">
            <div class="info-label">Email:</div>
            <div class="info-value">${escapeHtml(budget.clientEmail)}</div>
          </div>
          ` : ""}
          ${budget.clientPhone ? `
          <div class="info-row">
            <div class="info-label">Tel\xE9fono:</div>
            <div class="info-value">${escapeHtml(budget.clientPhone)}</div>
          </div>
          ` : ""}
          ${budget.clientAddress ? `
          <div class="info-row">
            <div class="info-label">Direcci\xF3n:</div>
            <div class="info-value">${escapeHtml(budget.clientAddress)}</div>
          </div>
          ` : ""}
        </div>

        <!-- DETALLE DE SERVICIOS -->
        <div class="section-title">DETALLE DE SERVICIOS</div>
        <table>
          <thead>
            <tr>
              <th style="width:auto">CONCEPTO</th>
              <th style="width:70px;text-align:right">CANT.</th>
              <th style="width:90px;text-align:right">PRECIO UNIT.</th>
              <th style="width:90px;text-align:right">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows || '<tr><td colspan="4" style="text-align:center;padding:20px;color:#718096">No hay items en este presupuesto</td></tr>'}
          </tbody>
        </table>

        <!-- TOTALES -->
        <table class="totals-table">
          <tr>
            <td class="label">SUBTOTAL (Base Imponible):</td>
            <td class="amount">${Number(budget.subtotal || 0).toFixed(2)} \u20AC</td>
          </tr>
          <tr>
            <td class="label">I.V.A. (21%):</td>
            <td class="amount">${Number(budget.vatTotal || 0).toFixed(2)} \u20AC</td>
          </tr>
          <tr>
            <td class="label total-final">TOTAL PRESUPUESTO:</td>
            <td class="amount total-final">${Number(budget.total || 0).toFixed(2)} \u20AC</td>
          </tr>
        </table>

        ${budget.notes ? `
        <div class="info-box" style="background:#FFFBEB;border-color:#F59E0B">
          <div style="font-weight:600;color:#92400E;margin-bottom:6px;font-size:10px">OBSERVACIONES:</div>
          <div style="color:#78350F;font-size:9px;line-height:1.5">${escapeHtml(budget.notes)}</div>
        </div>
        ` : ""}

        <!-- T\xC9RMINOS Y CONDICIONES -->
        <div class="terms">
          <div class="terms-title">Condiciones del Presupuesto</div>
          <ul>
            <li><strong>Validez:</strong> Este presupuesto tiene una validez de ${budget.expiresAt ? "30 d\xEDas desde su emisi\xF3n" : "un mes desde la fecha de emisi\xF3n"}.</li>
            <li><strong>Forma de Pago:</strong> Domiciliaci\xF3n bancaria mensual. Los servicios se facturar\xE1n mensualmente por anticipado.</li>
            <li><strong>Servicios Incluidos:</strong> Los servicios detallados en este presupuesto incluyen la gesti\xF3n, tramitaci\xF3n y asesoramiento necesarios.</li>
            <li><strong>Precios:</strong> Todos los precios incluyen IVA. Los precios podr\xE1n ser revisados anualmente seg\xFAn IPC.</li>
            <li><strong>Documentaci\xF3n:</strong> El cliente se compromete a facilitar toda la documentaci\xF3n necesaria en tiempo y forma.</li>
            <li><strong>Inicio de Servicios:</strong> Los servicios comenzar\xE1n una vez firmado el presente presupuesto y recibida la documentaci\xF3n inicial.</li>
          </ul>
        </div>

        <!-- ACEPTACI\xD3N -->
        <div class="acceptance-box">
          <div class="acceptance-title">ACEPTACI\xD3N DEL PRESUPUESTO</div>
          <p style="margin:0 0 8px 0;font-size:9px">
            Para aceptar este presupuesto, por favor firme y devuelva este documento, o bien confirme su aceptaci\xF3n 
            mediante correo electr\xF3nico a info@asesorialallave.com
          </p>
          <div style="margin-top:15px;display:flex;justify-content:space-between">
            <div style="width:45%">
              <div class="signature-line">Firma del Cliente</div>
            </div>
            <div style="width:45%">
              <div class="signature-line">Fecha de Aceptaci\xF3n</div>
            </div>
          </div>
        </div>

        <!-- PIE DE P\xC1GINA -->
        <div class="footer">
          <strong>${escapeHtml(companyName)}</strong> | ${escapeHtml(companyAddress)} | Tel: ${escapeHtml(companyPhone)}<br>
          Email: ${escapeHtml(companyEmail)} | ${escapeHtml(companyWeb)}<br>
          <span style="font-size:8px">Documento generado electr\xF3nicamente - ${formatDate2(/* @__PURE__ */ new Date())}</span>
        </div>
      </div>
    </body>
  </html>
  `;
}
function escapeHtml(input) {
  return String(input || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;");
}

// server/utils/budgets.ts
import crypto2 from "crypto";
var SECRET = process.env.BUDGETS_SECRET || process.env.JWT_SECRET || "change-me-budget-secret";
function generateAcceptanceHash(code, createdAt) {
  const hmac = crypto2.createHmac("sha256", SECRET);
  hmac.update(code + "|" + createdAt.toISOString());
  return hmac.digest("hex");
}
function verifyAcceptanceHash(code, createdAt, hash) {
  const expected = generateAcceptanceHash(code, createdAt);
  return crypto2.timingSafeEqual(Buffer.from(expected), Buffer.from(hash));
}

// server/budgets.ts
import nodemailer2 from "nodemailer";
import path2 from "path";
import fs2 from "fs";
import jwt2 from "jsonwebtoken";
import ExcelJS from "exceljs";

// server/services/budgets/calculatePyme.ts
init_prisma_client();
var parametersCache = null;
var cacheTimestamp = 0;
var CACHE_DURATION = 5 * 60 * 1e3;
async function getParameters() {
  const now = Date.now();
  if (parametersCache && now - cacheTimestamp < CACHE_DURATION) {
    return parametersCache;
  }
  const params = await prisma_client_default.budget_parameters.findMany({
    where: {
      budgetType: "PYME",
      isActive: true
    }
  });
  const paramsMap = /* @__PURE__ */ new Map();
  params.forEach((param) => {
    const key = param.paramKey;
    if (!paramsMap.has(key)) {
      paramsMap.set(key, []);
    }
    paramsMap.get(key).push(param);
  });
  parametersCache = paramsMap;
  cacheTimestamp = now;
  return paramsMap;
}
function getPrecioBaseContabilidad(nivel) {
  const PRECIOS_BASE2 = {
    0: 120,
    1: 150,
    2: 175,
    3: 215,
    4: 250,
    5: 280,
    6: 325,
    7: 425,
    8: 525
  };
  return PRECIOS_BASE2[nivel] || 250;
}
function getPrecioNomina(cantidad, params) {
  const tramos = params.get("TRAMO_NOMINAS") || [];
  for (const tramo of tramos) {
    if (tramo.minRange !== null && tramo.maxRange !== null) {
      if (cantidad >= tramo.minRange && cantidad <= tramo.maxRange) {
        return Number(tramo.paramValue);
      }
    }
  }
  const defaultTramo = tramos.find((t) => t.minRange === 61);
  return defaultTramo ? Number(defaultTramo.paramValue) : 10;
}
function getMultiplicadorFacturacion(facturacion) {
  const MULTIPLICADORES = [
    { max: 1e5, multiplicador: 1.05 },
    { max: 2e5, multiplicador: 1.08 },
    { max: 3e5, multiplicador: 1.1 },
    { max: 4e5, multiplicador: 1.13 },
    { max: 5e5, multiplicador: 1.16 },
    { max: 6e5, multiplicador: 1.2 },
    { max: Infinity, multiplicador: 1.25 }
  ];
  const tramo = MULTIPLICADORES.find((t) => facturacion <= t.max);
  return tramo ? tramo.multiplicador : 1.25;
}
async function calculatePyme(input) {
  const items = [];
  let position = 1;
  const params = await getParameters();
  const baseContaParam = params.get("BASE_CONTABILIDAD")?.[0];
  const precioBase = baseContaParam ? Number(baseContaParam.paramValue) : getPrecioBaseContabilidad(input.asientosMes);
  items.push({
    concept: `Contabilidad base mensual`,
    category: "BASE_CONTABILIDAD",
    position: position++,
    quantity: 1,
    unitPrice: precioBase,
    vatPct: 21,
    subtotal: precioBase,
    total: precioBase * 1.21
  });
  let totalContabilidad = precioBase;
  const extras = [
    { key: "IMPUESTO_111", label: "Modelo 111 (Retenciones IRPF)", enabled: input.irpfAlquileres },
    { key: "IMPUESTO_115", label: "Modelo 115 (Retenciones alquileres)", enabled: input.irpfAlquileres },
    { key: "IMPUESTO_303", label: "Modelo 303 (IVA Trimestral)", enabled: input.ivaIntracomunitario }
  ];
  extras.forEach((extra) => {
    if (extra.enabled) {
      const extraParam = params.get(extra.key)?.[0];
      const precio = extraParam ? Number(extraParam.paramValue) : 25;
      items.push({
        concept: extra.label,
        category: extra.key,
        position: position++,
        quantity: 1,
        unitPrice: precio,
        vatPct: 21,
        subtotal: precio,
        total: precio * 1.21
      });
      totalContabilidad += precio;
    }
  });
  if (input.notificaciones) {
    items.push({
      concept: "Notificaciones",
      category: "EXTRA_NOTIFICACIONES",
      position: position++,
      quantity: 1,
      unitPrice: 5,
      vatPct: 21,
      subtotal: 5,
      total: 5 * 1.21
    });
    totalContabilidad += 5;
  }
  if (input.estadisticasINE) {
    items.push({
      concept: "Estad\xEDsticas INE",
      category: "EXTRA_INE",
      position: position++,
      quantity: 1,
      unitPrice: 5,
      vatPct: 21,
      subtotal: 5,
      total: 5 * 1.21
    });
    totalContabilidad += 5;
  }
  const multiplicador = getMultiplicadorFacturacion(input.facturacion);
  if (multiplicador > 1) {
    const incremento = totalContabilidad * (multiplicador - 1);
    items.push({
      concept: `Recargo por facturaci\xF3n (${input.facturacion.toLocaleString()}\u20AC) - ${((multiplicador - 1) * 100).toFixed(0)}%`,
      category: "RECARGO_FACTURACION",
      position: position++,
      quantity: 1,
      unitPrice: incremento,
      vatPct: 21,
      subtotal: incremento,
      total: incremento * 1.21
    });
    totalContabilidad += incremento;
  }
  let totalLaboral = 0;
  if (input.nominasMes > 0) {
    const precioNomina = getPrecioNomina(input.nominasMes, params);
    const totalNominas = input.nominasMes * precioNomina;
    items.push({
      concept: `N\xF3minas (${input.nominasMes} x ${precioNomina}\u20AC)`,
      category: "NOMINAS",
      position: position++,
      quantity: input.nominasMes,
      unitPrice: precioNomina,
      vatPct: 21,
      subtotal: totalNominas,
      total: totalNominas * 1.21
    });
    totalLaboral = totalNominas;
  }
  let totalBase = totalContabilidad + totalLaboral;
  if (input.periodo === "MENSUAL") {
    const mensualidad = Math.max(totalBase * 0.2, 10);
    items.push({
      concept: "Recargo por liquidaciones mensuales",
      category: "RECARGO_MENSUALIDAD",
      position: position++,
      quantity: 1,
      unitPrice: mensualidad,
      vatPct: 21,
      subtotal: mensualidad,
      total: mensualidad * 1.21
    });
    totalBase += mensualidad;
    totalContabilidad += mensualidad;
  }
  if (input.emprendedor) {
    const descuento = totalBase * 0.2;
    items.push({
      concept: "Descuento Emprendedor (-20%)",
      category: "DESCUENTO_EMPRENDEDOR",
      position: position++,
      quantity: 1,
      unitPrice: -descuento,
      vatPct: 21,
      subtotal: -descuento,
      total: -descuento * 1.21
    });
    totalBase -= descuento;
  }
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const vatTotal = items.reduce((sum, item) => sum + item.subtotal * (item.vatPct / 100), 0);
  const total = subtotal + vatTotal;
  return {
    items,
    subtotal: Math.round(subtotal * 100) / 100,
    vatTotal: Math.round(vatTotal * 100) / 100,
    total: Math.round(total * 100) / 100
  };
}
function clearParametersCache() {
  parametersCache = null;
  cacheTimestamp = 0;
}

// server/services/budgets/index.ts
init_calculateAutonomo();

// server/services/budgets/calculateRenta.ts
init_prisma_client();
var parametersCache2 = null;
var cacheTimestamp3 = 0;
var CACHE_DURATION3 = 5 * 60 * 1e3;
async function getParameters2() {
  const now = Date.now();
  if (parametersCache2 && now - cacheTimestamp3 < CACHE_DURATION3) {
    return parametersCache2;
  }
  const params = await prisma_client_default.budget_parameters.findMany({
    where: {
      budgetType: "RENTA",
      isActive: true
    }
  });
  const paramsMap = /* @__PURE__ */ new Map();
  params.forEach((param) => {
    paramsMap.set(param.paramKey, param);
  });
  parametersCache2 = paramsMap;
  cacheTimestamp3 = now;
  return paramsMap;
}
var PRECIOS_BASE = {
  MATRIMONIO: 50,
  MATRIMONIO_HIJOS: 50,
  OTROS: 40
};
async function calculateRenta(input) {
  const items = [];
  let position = 1;
  const params = await getParameters2();
  let precioBase = 40;
  let conceptoBase = "Declaraci\xF3n Individual/Otros";
  if (input.unidadFamiliar === "MATRIMONIO") {
    const param = params.get("UNIDAD_FAMILIAR_MATRIMONIO");
    precioBase = param ? Number(param.paramValue) : PRECIOS_BASE.MATRIMONIO;
    conceptoBase = "Declaraci\xF3n Matrimonio";
  } else if (input.unidadFamiliar === "MATRIMONIO_HIJOS") {
    const param = params.get("UNIDAD_FAMILIAR_MATRIMONIO_HIJOS");
    precioBase = param ? Number(param.paramValue) : PRECIOS_BASE.MATRIMONIO_HIJOS;
    conceptoBase = "Declaraci\xF3n Matrimonio con hijos";
  } else {
    const param = params.get("UNIDAD_FAMILIAR_OTROS");
    precioBase = param ? Number(param.paramValue) : PRECIOS_BASE.OTROS;
  }
  items.push({
    concept: conceptoBase,
    category: "BASE_RENTA",
    position: position++,
    quantity: 1,
    unitPrice: precioBase,
    vatPct: 21,
    subtotal: precioBase,
    total: precioBase * 1.21
  });
  if (input.autonomo) {
    const param = params.get("EXTRA_AUTONOMO");
    const precio = param ? Number(param.paramValue) : 20;
    items.push({
      concept: "Actividad Econ\xF3mica (Aut\xF3nomo)",
      category: "EXTRA_AUTONOMO",
      position: position++,
      quantity: 1,
      unitPrice: precio,
      vatPct: 21,
      subtotal: precio,
      total: precio * 1.21
    });
  }
  if (input.inmueblesAlquilados > 0) {
    const total2 = input.inmueblesAlquilados * 15;
    items.push({
      concept: `Inmuebles alquilados (${input.inmueblesAlquilados} x 15\u20AC)`,
      category: "EXTRA_INMUEBLES_ALQ",
      position: position++,
      quantity: input.inmueblesAlquilados,
      unitPrice: 15,
      vatPct: 21,
      subtotal: total2,
      total: total2 * 1.21
    });
  }
  if (input.ventaInmuebles > 0) {
    const total2 = input.ventaInmuebles * 20;
    items.push({
      concept: `Venta de inmuebles (${input.ventaInmuebles} x 20\u20AC)`,
      category: "EXTRA_VENTA_INMUEBLES",
      position: position++,
      quantity: input.ventaInmuebles,
      unitPrice: 20,
      vatPct: 21,
      subtotal: total2,
      total: total2 * 1.21
    });
  }
  if (input.ventaFinancieros > 0) {
    const total2 = input.ventaFinancieros * 20;
    items.push({
      concept: `Venta de productos financieros/acciones (${input.ventaFinancieros} x 20\u20AC)`,
      category: "EXTRA_VENTA_FINANCIEROS",
      position: position++,
      quantity: input.ventaFinancieros,
      unitPrice: 20,
      vatPct: 21,
      subtotal: total2,
      total: total2 * 1.21
    });
  }
  if (input.otrasGanancias > 0) {
    const total2 = input.otrasGanancias * 20;
    items.push({
      concept: `Otras ganancias patrimoniales (${input.otrasGanancias} x 20\u20AC)`,
      category: "EXTRA_OTRAS_GANANCIAS",
      position: position++,
      quantity: input.otrasGanancias,
      unitPrice: 20,
      vatPct: 21,
      subtotal: total2,
      total: total2 * 1.21
    });
  }
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const vatTotal = items.reduce((sum, item) => sum + item.subtotal * (item.vatPct / 100), 0);
  const total = subtotal + vatTotal;
  return {
    items,
    subtotal: Math.round(subtotal * 100) / 100,
    vatTotal: Math.round(vatTotal * 100) / 100,
    total: Math.round(total * 100) / 100
  };
}
function clearParametersCache2() {
  parametersCache2 = null;
  cacheTimestamp3 = 0;
}

// server/services/budgets/calculateHerencias.ts
init_prisma_client();
var parametersCache3 = null;
var cacheTimestamp4 = 0;
var CACHE_DURATION4 = 5 * 60 * 1e3;
async function getParameters3() {
  const now = Date.now();
  if (parametersCache3 && now - cacheTimestamp4 < CACHE_DURATION4) {
    return parametersCache3;
  }
  const params = await prisma_client_default.budget_parameters.findMany({
    where: {
      budgetType: "HERENCIAS",
      isActive: true
    }
  });
  const paramsMap = /* @__PURE__ */ new Map();
  params.forEach((param) => {
    paramsMap.set(param.paramKey, param);
  });
  parametersCache3 = paramsMap;
  cacheTimestamp4 = now;
  return paramsMap;
}
var PRECIOS_UNITARIOS = {
  HEREDERO: 25,
  FINCA_COMUNIDAD: 25,
  FINCA_OTRAS: 40,
  PRODUCTO_FINANCIERO: 20,
  VEHICULO: 30,
  PLUSVALIA_POR_FINCA: 50,
  REGISTRO_POR_FINCA: 50
};
var PORCENTAJE_CAUDAL = 1e-3;
var RECARGOS_PCT = {
  SIN_TESTAMENTO: 0.3,
  // +30%
  SIN_ACUERDO: 0.6,
  // +60%
  ESCRITURAR: 0.3
  // +30%
};
var DESCUENTO_COMERCIAL = 0.15;
async function calculateHerencias(input) {
  if (input.caudalHereditario < 2e4) {
    throw new Error("El caudal hereditario m\xEDnimo es de 20.000\u20AC");
  }
  const tieneActivos = input.fincasComunidad > 0 || input.fincasOtras > 0 || input.productosFinancieros > 0 || input.vehiculos > 0;
  if (!tieneActivos) {
    throw new Error("Debe haber al menos un inmueble, producto financiero o veh\xEDculo");
  }
  const items = [];
  let position = 1;
  const params = await getParameters3();
  if (input.herederos > 0) {
    const param = params.get("INMUEBLE_HEREDERO");
    const precio = param ? Number(param.paramValue) : PRECIOS_UNITARIOS.HEREDERO;
    const subtotal2 = input.herederos * precio;
    items.push({
      concept: `Herederos (${input.herederos} x ${precio}\u20AC)`,
      category: "BASE_HEREDEROS",
      position: position++,
      quantity: input.herederos,
      unitPrice: precio,
      vatPct: 21,
      subtotal: subtotal2,
      total: subtotal2 * 1.21
    });
  }
  const fincasComunidad = input.fincasComunidad || 0;
  if (fincasComunidad > 0) {
    const param = params.get("INMUEBLE_COMUNIDAD");
    const precio = param ? Number(param.paramValue) : PRECIOS_UNITARIOS.FINCA_COMUNIDAD;
    const subtotal2 = fincasComunidad * precio;
    items.push({
      concept: `Fincas Comunidad Aut\xF3noma (${fincasComunidad} x ${precio}\u20AC)`,
      category: "BASE_FINCAS_COMUNIDAD",
      position: position++,
      quantity: fincasComunidad,
      unitPrice: precio,
      vatPct: 21,
      subtotal: subtotal2,
      total: subtotal2 * 1.21
    });
  }
  const fincasOtras = input.fincasOtras || 0;
  if (fincasOtras > 0) {
    const param = params.get("INMUEBLE_OTRAS_CCAA");
    const precio = param ? Number(param.paramValue) : PRECIOS_UNITARIOS.FINCA_OTRAS;
    const subtotal2 = fincasOtras * precio;
    items.push({
      concept: `Fincas otras CCAA (${fincasOtras} x ${precio}\u20AC)`,
      category: "BASE_FINCAS_OTRAS",
      position: position++,
      quantity: fincasOtras,
      unitPrice: precio,
      vatPct: 21,
      subtotal: subtotal2,
      total: subtotal2 * 1.21
    });
  }
  if (input.productosFinancieros > 0) {
    const param = params.get("PRODUCTO_FINANCIERO");
    const precio = param ? Number(param.paramValue) : PRECIOS_UNITARIOS.PRODUCTO_FINANCIERO;
    const subtotal2 = input.productosFinancieros * precio;
    items.push({
      concept: `Productos financieros (${input.productosFinancieros} x ${precio}\u20AC)`,
      category: "BASE_PRODUCTOS",
      position: position++,
      quantity: input.productosFinancieros,
      unitPrice: precio,
      vatPct: 21,
      subtotal: subtotal2,
      total: subtotal2 * 1.21
    });
  }
  if (input.vehiculos > 0) {
    const param = params.get("VEHICULO");
    const precio = param ? Number(param.paramValue) : PRECIOS_UNITARIOS.VEHICULO;
    const subtotal2 = input.vehiculos * precio;
    items.push({
      concept: `Veh\xEDculos (${input.vehiculos} x ${precio}\u20AC)`,
      category: "BASE_VEHICULOS",
      position: position++,
      quantity: input.vehiculos,
      unitPrice: precio,
      vatPct: 21,
      subtotal: subtotal2,
      total: subtotal2 * 1.21
    });
  }
  const totalFincas = fincasComunidad + fincasOtras;
  if (totalFincas > 0) {
    const subtotal2 = totalFincas * PRECIOS_UNITARIOS.PLUSVALIA_POR_FINCA;
    items.push({
      concept: `Plusval\xEDas (${totalFincas} fincas x ${PRECIOS_UNITARIOS.PLUSVALIA_POR_FINCA}\u20AC)`,
      category: "SERVICIO_PLUSVALIAS",
      position: position++,
      quantity: totalFincas,
      unitPrice: PRECIOS_UNITARIOS.PLUSVALIA_POR_FINCA,
      vatPct: 21,
      subtotal: subtotal2,
      total: subtotal2 * 1.21
    });
  }
  if (totalFincas > 0) {
    const subtotal2 = totalFincas * PRECIOS_UNITARIOS.REGISTRO_POR_FINCA;
    items.push({
      concept: `Registros (${totalFincas} fincas x ${PRECIOS_UNITARIOS.REGISTRO_POR_FINCA}\u20AC)`,
      category: "SERVICIO_REGISTROS",
      position: position++,
      quantity: totalFincas,
      unitPrice: PRECIOS_UNITARIOS.REGISTRO_POR_FINCA,
      vatPct: 21,
      subtotal: subtotal2,
      total: subtotal2 * 1.21
    });
  }
  let subtotalBase = items.reduce((sum, item) => sum + item.subtotal, 0);
  const recargoCaudal = input.caudalHereditario * PORCENTAJE_CAUDAL;
  items.push({
    concept: `Recargo caudal hereditario (${input.caudalHereditario.toLocaleString("es-ES")}\u20AC x 0.1%)`,
    category: "RECARGO_CAUDAL",
    position: position++,
    quantity: 1,
    unitPrice: recargoCaudal,
    vatPct: 21,
    subtotal: recargoCaudal,
    total: recargoCaudal * 1.21
  });
  if (input.sinTestamento) {
    const recargo = subtotalBase * RECARGOS_PCT.SIN_TESTAMENTO;
    items.push({
      concept: "Recargo sin testamento (+30%)",
      category: "RECARGO_SIN_TESTAMENTO",
      position: position++,
      quantity: 1,
      unitPrice: recargo,
      vatPct: 21,
      subtotal: recargo,
      total: recargo * 1.21
    });
  }
  if (input.sinAcuerdo) {
    const recargo = subtotalBase * RECARGOS_PCT.SIN_ACUERDO;
    items.push({
      concept: "Recargo sin acuerdo entre herederos (+60%)",
      category: "RECARGO_SIN_ACUERDO",
      position: position++,
      quantity: 1,
      unitPrice: recargo,
      vatPct: 21,
      subtotal: recargo,
      total: recargo * 1.21
    });
  }
  if (input.escriturar) {
    const recargo = subtotalBase * RECARGOS_PCT.ESCRITURAR;
    items.push({
      concept: "Recargo por escrituraci\xF3n de herencia (+30%)",
      category: "RECARGO_ESCRITURAR",
      position: position++,
      quantity: 1,
      unitPrice: recargo,
      vatPct: 21,
      subtotal: recargo,
      total: recargo * 1.21
    });
  }
  if (input.aplicarDescuento15) {
    const subtotalConRecargos = items.reduce((sum, item) => sum + item.subtotal, 0);
    const descuento = subtotalConRecargos * DESCUENTO_COMERCIAL;
    items.push({
      concept: "Descuento comercial (15%)",
      category: "DESCUENTO_COMERCIAL",
      position: position++,
      quantity: 1,
      unitPrice: -descuento,
      vatPct: 21,
      subtotal: -descuento,
      total: -descuento * 1.21
    });
  }
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const vatTotal = items.reduce((sum, item) => sum + item.subtotal * (item.vatPct / 100), 0);
  const total = subtotal + vatTotal;
  return {
    items,
    subtotal: Math.round(subtotal * 100) / 100,
    vatTotal: Math.round(vatTotal * 100) / 100,
    total: Math.round(total * 100) / 100
  };
}
function clearParametersCache3() {
  parametersCache3 = null;
  cacheTimestamp4 = 0;
}

// server/budgets.ts
import { randomUUID as randomUUID2 } from "crypto";
var router3 = express3.Router();
var toNumber = (value, fallback = 0) => {
  if (value === null || value === void 0) return fallback;
  if (typeof value === "string" && value.trim() === "") return fallback;
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};
var parseJsonMaybe = (value) => {
  if (value === null || value === void 0 || value === "") return null;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};
var normalizeBudgetItem = (item) => {
  if (!item) return item;
  const quantity = toNumber(item.quantity, 0) || 1;
  let unitPriceRaw = item.unitPrice ?? item.unit_price ?? item.price ?? null;
  if (!unitPriceRaw || toNumber(unitPriceRaw, 0) === 0) {
    if (item.subtotal !== void 0) {
      unitPriceRaw = toNumber(item.subtotal, 0) / quantity;
    }
  }
  return {
    ...item,
    quantity,
    unitPrice: toNumber(unitPriceRaw, 0),
    price: toNumber(unitPriceRaw, 0),
    vatPct: item.vatPct !== void 0 ? toNumber(item.vatPct, null) : toNumber(item.vat_pct, null),
    subtotal: toNumber(item.subtotal, 0),
    total: toNumber(item.total, 0)
  };
};
var normalizeBudget = (budget) => {
  if (!budget) return null;
  const {
    budget_items,
    budget_email_logs,
    client_nif,
    client_email,
    client_phone,
    client_address,
    company_brand,
    template_snapshot,
    vat_total,
    custom_total,
    manually_edited,
    ...rest
  } = budget;
  const subtotal = toNumber(rest.subtotal, 0);
  const total = toNumber(rest.total, 0);
  return {
    ...rest,
    subtotal,
    total,
    clientNif: client_nif ?? null,
    clientEmail: client_email ?? null,
    clientPhone: client_phone ?? null,
    clientAddress: client_address ?? null,
    companyBrand: company_brand ?? "LA_LLAVE",
    templateSnapshot: parseJsonMaybe(template_snapshot),
    vatTotal: vat_total !== void 0 ? toNumber(vat_total, 0) : null,
    customTotal: custom_total !== void 0 ? custom_total === null ? null : toNumber(custom_total) : null,
    manuallyEdited: Boolean(manually_edited),
    items: Array.isArray(budget_items) ? budget_items.map(normalizeBudgetItem) : void 0,
    emails: Array.isArray(budget_email_logs) ? budget_email_logs : void 0
  };
};
function ensureRole(req, res, next) {
  const roleName = req.user?.roleName;
  if (roleName === "Administrador" || roleName === "Gestor") return next();
  return res.status(403).json({ error: "No autorizado" });
}
router3.get("/", authenticateToken, ensureRole, async (req, res) => {
  try {
    const page = Number(req.query.page || 1);
    const size = Number(req.query.size || 50);
    const skip = (page - 1) * size;
    const where = {};
    if (req.query.status) where.status = String(req.query.status);
    if (req.query.series) where.series = String(req.query.series);
    if (req.query.type) where.type = String(req.query.type);
    if (req.query.q) {
      const q = String(req.query.q);
      where.OR = [
        { code: { contains: q } },
        { clientName: { contains: q } },
        { clientEmail: { contains: q } }
      ];
    }
    const p = prisma_client_default;
    const [items, total] = await Promise.all([
      p.budgets.findMany({ where, orderBy: { date: "desc" }, take: size, skip }),
      p.budgets.count({ where })
    ]);
    const normalizedItems = items.map((item) => normalizeBudget(item));
    res.json({ items: normalizedItems, total, page, size });
  } catch (err) {
    console.error("GET /api/budgets", err);
    res.status(500).json({ error: err.message });
  }
});
router3.get("/:id", authenticateToken, ensureRole, async (req, res) => {
  try {
    const { id } = req.params;
    console.log("\u{1F50D} GET /api/budgets/:id - ID solicitado:", id);
    const p = prisma_client_default;
    const budget = await p.budgets.findUnique({
      where: { id },
      include: {
        budget_items: { orderBy: { position: "asc" } },
        budget_email_logs: { orderBy: { createdAt: "desc" } }
      }
    });
    console.log("\u{1F4CA} Resultado de la consulta:", budget ? `Encontrado: ${budget.code}` : "No encontrado");
    if (!budget) return res.status(404).json({ error: "Not found" });
    res.json(normalizeBudget(budget));
  } catch (err) {
    console.error("\u274C Error en GET /api/budgets/:id", err);
    res.status(500).json({ error: err.message });
  }
});
router3.get("/:id/pdf", async (req, res) => {
  try {
    const { id } = req.params;
    const token = req.query.token || req.headers.authorization?.replace("Bearer ", "") || req.cookies?.token;
    if (!token) {
      return res.status(401).json({ error: "Token no proporcionado" });
    }
    let user;
    try {
      user = jwt2.verify(token, process.env.JWT_SECRET || "your-secret-key");
    } catch (err) {
      return res.status(401).json({ error: "Token inv\xE1lido" });
    }
    const p = prisma_client_default;
    const fullUser = await p.users.findUnique({
      where: { id: user.id },
      include: { roles: true }
    });
    if (!fullUser) {
      return res.status(401).json({ error: "Usuario no encontrado" });
    }
    if (fullUser.roles?.name !== "Administrador" && fullUser.roles?.name !== "Gestor") {
      return res.status(403).json({ error: "No autorizado" });
    }
    const budget = await p.budgets.findUnique({
      where: { id },
      include: {
        items: { orderBy: { position: "asc" } }
      }
    });
    if (!budget) return res.status(404).json({ error: "Not found" });
    const pdfResult = await createBudgetPdf(budget);
    const filepath = path2.join(process.cwd(), "uploads", "budgets", pdfResult.filename);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${budget.code || "presupuesto"}.pdf"`);
    const fileStream = fs2.createReadStream(filepath);
    fileStream.pipe(res);
    fileStream.on("error", (err) => {
      console.error("Error streaming PDF:", err);
      res.status(500).json({ error: "Error al generar PDF" });
    });
  } catch (err) {
    console.error("GET /api/budgets/:id/pdf", err);
    res.status(500).json({ error: err.message });
  }
});
router3.post("/", authenticateToken, ensureRole, async (req, res) => {
  try {
    const data = req.body;
    let calculatedItems;
    let calculatedSubtotal;
    let calculatedVatTotal;
    let calculatedTotal;
    if (data.type && data.inputs) {
      let calcResult;
      switch (data.type) {
        case "PYME":
          calcResult = await calculatePyme(data.inputs);
          break;
        case "AUTONOMO":
          calcResult = await calculateAutonomo(data.inputs);
          break;
        case "RENTA":
          calcResult = await calculateRenta(data.inputs);
          break;
        case "HERENCIAS":
          calcResult = await calculateHerencias(data.inputs);
          break;
        default:
          return res.status(400).json({ error: `Tipo de presupuesto no v\xE1lido: ${data.type}` });
      }
      calculatedItems = calcResult.items.map((item) => ({
        catalogKey: null,
        description: item.concept,
        category: item.category,
        quantity: item.quantity,
        unit: "ud",
        unitPrice: item.unitPrice,
        vatPct: item.vatPct,
        subtotal: item.subtotal
      }));
      calculatedSubtotal = calcResult.subtotal;
      calculatedVatTotal = calcResult.vatTotal;
      calculatedTotal = calcResult.total;
    }
    const now = /* @__PURE__ */ new Date();
    const year = now.getFullYear();
    const series = data.series || "AL";
    const p = prisma_client_default;
    const last = await p.budgets.findFirst({ where: { year, series }, orderBy: { number: "desc" } });
    const number = last ? last.number + 1 : 1;
    const code = `${series}-${year}-${String(number).padStart(4, "0")}`;
    const date = data.date ? new Date(data.date) : now;
    const validDays = data.validDays ?? 30;
    const expiresAt = new Date(date);
    expiresAt.setDate(expiresAt.getDate() + Number(validDays));
    const acceptanceHash = generateAcceptanceHash(code, date);
    const budgetId = randomUUID2();
    const created = await p.budgets.create({
      data: {
        id: budgetId,
        series,
        number,
        year,
        code,
        date,
        validDays: Number(validDays),
        expiresAt,
        acceptanceHash,
        type: data.type || "PYME",
        company_brand: data.companyBrand || "LA_LLAVE",
        clientName: data.clientName || "",
        client_nif: data.clientNif || null,
        client_email: data.clientEmail || null,
        client_phone: data.clientPhone || null,
        client_address: data.clientAddress || null,
        notes: data.notes || null,
        subtotal: calculatedSubtotal ?? Number(data.subtotal || 0),
        vat_total: calculatedVatTotal ?? Number(data.vatTotal || 0),
        total: calculatedTotal ?? Number(data.total || 0),
        template_snapshot: data.templateSnapshot ? JSON.stringify(data.templateSnapshot) : null,
        manually_edited: Boolean(data.manuallyEdited ?? false),
        custom_total: data.customTotal !== void 0 && data.customTotal !== null ? Number(data.customTotal) : null,
        currency: data.currency || "EUR",
        createdAt: now,
        updatedAt: now
      }
    });
    const itemsToCreate = calculatedItems || data.items || [];
    if (Array.isArray(itemsToCreate) && itemsToCreate.length > 0) {
      for (let i = 0; i < itemsToCreate.length; i++) {
        const item = itemsToCreate[i];
        const quantity = toNumber(item.quantity, 1);
        const unitPrice = toNumber(
          item.unitPrice ?? item.price ?? (item.subtotal !== void 0 ? toNumber(item.subtotal, 0) / (quantity || 1) : 0),
          0
        );
        const vatPct = toNumber(item.vatPct, 0);
        const subtotal = item.subtotal !== void 0 ? toNumber(item.subtotal, 0) : quantity * unitPrice;
        const total = subtotal * (1 + vatPct / 100);
        await p.budget_items.create({
          data: {
            id: randomUUID2(),
            budgetId: created.id,
            concept: item.description || item.concept || "",
            category: item.category || null,
            position: item.position ?? item.order ?? i + 1,
            quantity,
            unitPrice,
            vatPct,
            subtotal,
            total
          }
        });
      }
    }
    const budgetWithItems = await p.budgets.findUnique({
      where: { id: created.id },
      include: {
        budget_items: { orderBy: { position: "asc" } },
        budget_email_logs: { orderBy: { createdAt: "desc" } }
      }
    });
    res.status(201).json(normalizeBudget(budgetWithItems));
  } catch (err) {
    console.error("POST /api/budgets", err);
    res.status(500).json({ error: err.message });
  }
});
router3.put("/:id", authenticateToken, ensureRole, async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const p = prisma_client_default;
    const existing = await p.budgets.findUnique({
      where: { id },
      include: { items: true }
    });
    if (!existing) {
      return res.status(404).json({ error: "Presupuesto no encontrado" });
    }
    const updateData = {
      updatedAt: /* @__PURE__ */ new Date()
    };
    if (data.clientName !== void 0) updateData.clientName = data.clientName;
    if (data.clientNif !== void 0) updateData.client_nif = data.clientNif;
    if (data.clientEmail !== void 0) updateData.client_email = data.clientEmail;
    if (data.clientPhone !== void 0) updateData.client_phone = data.clientPhone;
    if (data.clientAddress !== void 0) updateData.client_address = data.clientAddress;
    if (data.companyBrand !== void 0) updateData.company_brand = data.companyBrand;
    if (data.validDays !== void 0) updateData.validDays = Number(data.validDays);
    if (data.validityDays !== void 0) updateData.validDays = Number(data.validityDays);
    if (data.notes !== void 0) updateData.notes = data.notes;
    if (data.templateSnapshot !== void 0) {
      updateData.template_snapshot = data.templateSnapshot ? JSON.stringify(data.templateSnapshot) : null;
    }
    if (data.customTotal !== void 0) {
      if (data.customTotal === null) {
        updateData.custom_total = null;
        updateData.manually_edited = false;
      } else {
        updateData.custom_total = Number(data.customTotal);
        updateData.manually_edited = true;
      }
    }
    if (data.subtotal !== void 0) updateData.subtotal = Number(data.subtotal);
    if (data.vatTotal !== void 0) updateData.vat_total = Number(data.vatTotal);
    if (data.total !== void 0) updateData.total = Number(data.total);
    const updated = await p.budgets.update({
      where: { id },
      data: updateData
    });
    if (data.items && Array.isArray(data.items)) {
      await p.budget_items.deleteMany({ where: { budgetId: id } });
      for (let i = 0; i < data.items.length; i++) {
        const item = data.items[i];
        const quantity = toNumber(item.quantity, 1);
        const unitPrice = toNumber(
          item.unitPrice ?? item.price ?? (item.subtotal !== void 0 ? toNumber(item.subtotal, 0) / (quantity || 1) : 0),
          0
        );
        const vatPct = toNumber(item.vatPct, 21);
        const subtotal = item.subtotal !== void 0 ? toNumber(item.subtotal, quantity * unitPrice) : quantity * unitPrice;
        const total = item.total !== void 0 ? toNumber(item.total, subtotal * (1 + vatPct / 100)) : subtotal * (1 + vatPct / 100);
        await p.budget_items.create({
          data: {
            id: randomUUID2(),
            budgetId: id,
            concept: item.concept || item.description || "",
            category: item.category || null,
            position: item.position ?? item.order ?? i + 1,
            quantity,
            unitPrice,
            vatPct,
            subtotal,
            total,
            isManuallyEdited: item.isManuallyEdited || false
          }
        });
      }
    }
    const budgetWithItems = await p.budgets.findUnique({
      where: { id },
      include: {
        budget_items: { orderBy: { position: "asc" } },
        budget_email_logs: { orderBy: { createdAt: "desc" } }
      }
    });
    console.log(`\u2705 Presupuesto ${updated.code} actualizado por ${req.user?.username}`);
    res.json(normalizeBudget(budgetWithItems));
  } catch (err) {
    console.error("PUT /api/budgets/:id", err);
    res.status(500).json({ error: err.message });
  }
});
router3.post("/:id/send", authenticateToken, ensureRole, async (req, res) => {
  try {
    const { id } = req.params;
    const p = prisma_client_default;
    const budget = await p.budgets.findUnique({ where: { id } });
    if (!budget) return res.status(404).json({ error: "Not found" });
    const hash = generateAcceptanceHash(budget.code, budget.date);
    await p.budgets.update({ where: { id }, data: { acceptanceHash: hash, status: "SENT" } });
    let pdfRecord = null;
    try {
      const pdfPath = await createBudgetPdf(budget);
      pdfRecord = await p.budget_pdfs.create({ data: { budgetId: id, filename: pdfPath.filename, url: pdfPath.url } });
    } catch (pdfErr) {
      console.warn("PDF generation failed", pdfErr);
    }
    let emailLog = null;
    try {
      if (budget.client_email) {
        const smtp = getSMTPConfig();
        const transporter2 = smtp ? nodemailer2.createTransport({ host: smtp.host, port: smtp.port, secure: smtp.port === 465, auth: { user: smtp.user, pass: smtp.pass } }) : null;
        const acceptUrl = `${process.env.FRONTEND_URL || "https://tu-dominio"}/public/budgets/${encodeURIComponent(budget.code)}/accept?t=${encodeURIComponent(hash)}`;
        const subject = `Presupuesto ${budget.code} de Asesor\xEDa La Llave`;
        const html = `
          <div>
            <p>Hola ${budget.clientName || ""},</p>
            <p>Adjuntamos su presupuesto <strong>${budget.code}</strong>. Puede aceptarlo en el siguiente enlace:</p>
            <p><a href="${acceptUrl}">Aceptar presupuesto</a></p>
          </div>
        `;
        let sent = false;
        let response = null;
        if (transporter2) {
          try {
            response = await transporter2.sendMail({ from: smtp.user, to: budget.client_email, subject, html, attachments: pdfRecord ? [{ filename: pdfRecord.filename, path: path2.join(process.cwd(), "uploads", "budgets", pdfRecord.filename) }] : void 0 });
            sent = true;
          } catch (mailErr) {
            console.warn("Failed sending budget email", mailErr);
          }
        }
        emailLog = await p.budget_email_logs.create({ data: { budgetId: id, status: sent ? "SENT" : "FAILED", toEmail: budget.client_email, subject, response: response ? response : null } });
      }
    } catch (mailErr) {
      console.warn("Error sending email for budget", id, mailErr);
    }
    res.json({ ok: true, acceptanceHash: hash, pdf: pdfRecord, emailLog });
  } catch (err) {
    console.error("POST /api/budgets/:id/send", err);
    res.status(500).json({ error: err.message });
  }
});
router3.post("/:id/remind", authenticateToken, ensureRole, async (req, res) => {
  try {
    const { id } = req.params;
    const p = prisma_client_default;
    const budget = await p.budgets.findUnique({ where: { id } });
    if (!budget) return res.status(404).json({ error: "Not found" });
    if (!budget.client_email) return res.status(400).json({ error: "No client email" });
    if (budget.status !== "SENT" && budget.status !== "DRAFT") {
      return res.status(400).json({ error: "Can only remind SENT or DRAFT budgets" });
    }
    if (budget.expiresAt && new Date(budget.expiresAt) < /* @__PURE__ */ new Date()) {
      return res.status(400).json({ error: "Budget already expired" });
    }
    const smtp = getSMTPConfig();
    const transporter2 = smtp ? nodemailer2.createTransport({ host: smtp.host, port: smtp.port, secure: smtp.port === 465, auth: { user: smtp.user, pass: smtp.pass } }) : null;
    const acceptUrl = `${process.env.FRONTEND_URL || "https://tu-dominio"}/public/budgets/${encodeURIComponent(budget.code)}/accept?t=${encodeURIComponent(budget.acceptanceHash || "")}`;
    const subject = `Recordatorio: Presupuesto ${budget.code}`;
    const html = `
      <div>
        <p>Hola ${budget.clientName || ""},</p>
        <p>Te recordamos que tu presupuesto <strong>${budget.code}</strong> est\xE1 pendiente de aceptaci\xF3n.</p>
        ${budget.expiresAt ? `<p>V\xE1lido hasta: ${new Date(budget.expiresAt).toLocaleDateString()}</p>` : ""}
        <p><a href="${acceptUrl}">Aceptar presupuesto</a></p>
      </div>
    `;
    let sent = false;
    let response = null;
    if (transporter2) {
      try {
        response = await transporter2.sendMail({ from: smtp.user, to: budget.client_email, subject, html });
        sent = true;
      } catch (mailErr) {
        console.warn("Failed sending reminder email", mailErr);
      }
    }
    const emailLog = await p.budget_email_logs.create({
      data: {
        budgetId: id,
        status: sent ? "SENT" : "FAILED",
        toEmail: budget.client_email,
        subject,
        response: response ? response : null
      }
    });
    res.json({ ok: true, sent, emailLog });
  } catch (err) {
    console.error("POST /api/budgets/:id/remind", err);
    res.status(500).json({ error: err.message });
  }
});
router3.get("/export.csv", authenticateToken, ensureRole, async (req, res) => {
  try {
    const where = {};
    if (req.query.status) where.status = String(req.query.status);
    if (req.query.series) where.series = String(req.query.series);
    const p = prisma_client_default;
    const items = await p.budgets.findMany({ where, orderBy: { date: "desc" } });
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="budgets.csv"`);
    res.write("code,date,clientName,clientEmail,series,status,subtotal,vatTotal,total,expiresAt,acceptedAt\n");
    for (const raw of items) {
      const b = normalizeBudget(raw);
      res.write(`${b.code},${new Date(b.date).toISOString()},"${(b.clientName || "").replace(/"/g, '""')}",${b.clientEmail || ""},${b.series},${b.status},${b.subtotal},${b.vatTotal},${b.total},${b.expiresAt || ""},${b.acceptedAt || ""}
`);
    }
    res.end();
  } catch (err) {
    console.error("GET /api/budgets/export.csv", err);
    res.status(500).json({ error: err.message });
  }
});
router3.get("/export.xlsx", authenticateToken, ensureRole, async (req, res) => {
  try {
    const where = {};
    if (req.query.status) where.status = String(req.query.status);
    if (req.query.series) where.series = String(req.query.series);
    const p = prisma_client_default;
    const items = await p.budgets.findMany({ where, orderBy: { date: "desc" } });
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Presupuestos");
    sheet.columns = [
      { header: "code", key: "code", width: 20 },
      { header: "date", key: "date", width: 20 },
      { header: "clientName", key: "clientName", width: 30 },
      { header: "clientEmail", key: "clientEmail", width: 30 },
      { header: "series", key: "series", width: 10 },
      { header: "status", key: "status", width: 12 },
      { header: "subtotal", key: "subtotal", width: 12 },
      { header: "vatTotal", key: "vatTotal", width: 12 },
      { header: "total", key: "total", width: 12 },
      { header: "expiresAt", key: "expiresAt", width: 20 },
      { header: "acceptedAt", key: "acceptedAt", width: 20 }
    ];
    items.forEach((raw) => {
      const b = normalizeBudget(raw);
      sheet.addRow({
        code: b.code,
        date: new Date(b.date).toISOString(),
        clientName: b.clientName,
        clientEmail: b.clientEmail || "",
        series: b.series,
        status: b.status,
        subtotal: Number(b.subtotal || 0),
        vatTotal: Number(b.vatTotal || 0),
        total: Number(b.total || 0),
        expiresAt: b.expiresAt ? new Date(b.expiresAt).toISOString() : "",
        acceptedAt: b.acceptedAt ? new Date(b.acceptedAt).toISOString() : ""
      });
    });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="budgets.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("GET /api/budgets/export.xlsx", err);
    res.status(500).json({ error: err.message });
  }
});
var budgets_default = router3;

// server/public-budgets.ts
init_prisma_client();
import express4 from "express";
import nodemailer3 from "nodemailer";

// server/logger.ts
import pino from "pino";
import pinoHttp from "pino-http";
import { randomUUID as randomUUID3 } from "crypto";
import path3 from "path";
import fs3 from "fs";
var logsDir = process.env.LOG_DIR || path3.join(process.cwd(), "logs");
if (!fs3.existsSync(logsDir)) {
  fs3.mkdirSync(logsDir, { recursive: true });
}
var today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
var logFile = path3.join(logsDir, `app-${today}.log`);
var logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: process.env.NODE_ENV === "development" ? {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "HH:MM:ss Z",
      ignore: "pid,hostname"
    }
  } : void 0,
  ...process.env.NODE_ENV !== "development" && {
    // En producción, escribir a archivo
    stream: pino.destination({
      dest: logFile,
      sync: false
    })
  },
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    }
  }
});
var httpLogger = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const existingId = req.headers["x-request-id"];
    if (existingId && typeof existingId === "string") {
      return existingId;
    }
    return randomUUID3();
  },
  customLogLevel: (req, res, err) => {
    if (res.statusCode >= 500 || err) return "error";
    if (res.statusCode >= 400) return "warn";
    if (res.statusCode >= 300) return "info";
    return "info";
  },
  customSuccessMessage: (req, res) => {
    return `${req.method} ${req.url} ${res.statusCode}`;
  },
  customErrorMessage: (req, res, err) => {
    return `${req.method} ${req.url} ${res.statusCode} - ${err.message}`;
  },
  customAttributeKeys: {
    req: "request",
    res: "response",
    err: "error",
    responseTime: "duration"
  },
  serializers: {
    req: (req) => ({
      id: req.id,
      method: req.method,
      url: req.url,
      headers: {
        host: req.headers?.host,
        "user-agent": req.headers?.["user-agent"],
        "content-type": req.headers?.["content-type"]
      },
      remoteAddress: req.socket?.remoteAddress,
      remotePort: req.socket?.remotePort
    }),
    res: (res) => ({
      statusCode: res.statusCode,
      headers: {
        "content-type": typeof res.getHeader === "function" ? res.getHeader("content-type") : void 0,
        "content-length": typeof res.getHeader === "function" ? res.getHeader("content-length") : void 0
      }
    }),
    err: pino.stdSerializers.err
  },
  autoLogging: {
    ignore: (req) => {
      return !!(req.url === "/health" || req.url === "/ready" || req.url?.startsWith("/assets/") || req.url?.startsWith("/favicon"));
    }
  }
});
var securityLogger = logger.child({ module: "security" });
var dbLogger = logger.child({ module: "database" });
var authLogger = logger.child({ module: "auth" });
var jobLogger = logger.child({ module: "jobs" });
var storageLogger = logger.child({ module: "storage" });
function logError(error, context) {
  logger.error(
    {
      err: error,
      stack: error.stack,
      ...context
    },
    error.message
  );
}
function rotateOldLogs(retentionDays = 30) {
  try {
    const files = fs3.readdirSync(logsDir);
    const now = Date.now();
    const maxAge = retentionDays * 24 * 60 * 60 * 1e3;
    files.forEach((file) => {
      if (!file.startsWith("app-") || !file.endsWith(".log")) return;
      const filePath = path3.join(logsDir, file);
      const stats = fs3.statSync(filePath);
      const age = now - stats.mtimeMs;
      if (age > maxAge) {
        fs3.unlinkSync(filePath);
        logger.info(`Deleted old log file: ${file}`);
      }
    });
  } catch (error) {
    logger.error({ err: error }, "Error rotating logs");
  }
}
rotateOldLogs(30);
var logger_default = logger;

// server/public-budgets.ts
import path4 from "path";
import fs4 from "fs";
var router4 = express4.Router();
router4.get("/:code/accept", async (req, res) => {
  try {
    const { code } = req.params;
    const { t } = req.query;
    const p = prisma_client_default;
    const budget = await p.budgets.findUnique({
      where: { code },
      include: { items: { orderBy: { position: "asc" } } }
    });
    if (!budget) return res.status(404).json({ error: "Presupuesto no encontrado" });
    if (!t) return res.status(400).json({ error: "Token requerido" });
    const valid = verifyAcceptanceHash(budget.code, budget.date, String(t));
    if (!valid) return res.status(403).json({ error: "Token inv\xE1lido" });
    res.json(budget);
  } catch (err) {
    console.error("GET /public/budgets/:code/accept", err);
    res.status(500).json({ error: "Error interno" });
  }
});
router4.post("/:code/accept", async (req, res) => {
  try {
    const { code } = req.params;
    const { t } = req.query;
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    const agent = String(req.headers["user-agent"] || "");
    const p = prisma_client_default;
    const budget = await p.budgets.findUnique({ where: { code } });
    if (!budget) return res.status(404).json({ error: "Presupuesto no encontrado" });
    if (!t) return res.status(400).json({ error: "Token requerido" });
    logger_default.info(`\u{1F510} Verificando hash para presupuesto ${code}`);
    const valid = verifyAcceptanceHash(budget.code, budget.date, String(t));
    if (!valid) {
      logger_default.warn(`\u274C Hash inv\xE1lido para presupuesto ${code}`);
      return res.status(403).json({ error: "Token inv\xE1lido" });
    }
    if (budget.expiresAt && new Date(budget.expiresAt) < /* @__PURE__ */ new Date()) {
      logger_default.warn(`\u23F0 Presupuesto ${code} expirado`);
      return res.status(410).json({ error: "Presupuesto expirado" });
    }
    if (budget.acceptedAt) {
      logger_default.warn(`\u26A0\uFE0F Presupuesto ${code} ya fue aceptado anteriormente`);
      return res.status(400).json({
        error: "Este presupuesto ya fue aceptado anteriormente",
        acceptedAt: budget.acceptedAt
      });
    }
    const updatedBudget = await p.budgets.update({
      where: { id: budget.id },
      data: {
        acceptedAt: /* @__PURE__ */ new Date(),
        acceptedByIp: String(ip),
        acceptedByAgent: agent,
        status: "ACCEPTED"
      }
    });
    logger_default.info(`\u2705 Presupuesto ${code} aceptado exitosamente`);
    try {
      const isGestoriaOnline = budget.companyBrand === "GESTORIA_ONLINE";
      const companyName = isGestoriaOnline ? "GESTOR\xCDA ONLINE" : "ASESOR\xCDA LA LLAVE";
      const companyEmail = isGestoriaOnline ? "info@gestoriaonline.com" : "info@asesorialallave.com";
      const companyPhone = isGestoriaOnline ? "91 XXX XX XX" : "91 238 99 60";
      const companyColor = isGestoriaOnline ? "#1a7f64" : "#2E5C8A";
      if (budget.clientEmail) {
        const smtp = getSMTPConfig();
        const transporter2 = smtp ? nodemailer3.createTransport({
          host: smtp.host,
          port: smtp.port,
          secure: smtp.port === 465,
          auth: { user: smtp.user, pass: smtp.pass }
        }) : null;
        if (transporter2) {
          try {
            await transporter2.sendMail({
              from: smtp.user,
              to: budget.clientEmail,
              subject: `\u2705 Presupuesto ${budget.code} Aceptado - ${companyName}`,
              html: `
                <!DOCTYPE html>
                <html>
                <head>
                  <meta charset="utf-8">
                  <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
                    .container { max-width: 600px; margin: 0 auto; }
                    .header { background: ${companyColor}; color: white; padding: 30px 20px; text-align: center; }
                    .header h1 { margin: 0; font-size: 28px; }
                    .content { background: #f9f9f9; padding: 30px 20px; }
                    .success-box { background: #d4edda; border-left: 4px solid #28a745; padding: 20px; margin: 20px 0; border-radius: 5px; }
                    .success-box h2 { color: #155724; margin-top: 0; font-size: 20px; }
                    .info-table { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
                    .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
                    .info-row:last-child { border-bottom: none; }
                    .info-label { font-weight: bold; color: #666; }
                    .info-value { color: #333; }
                    .total { background: ${companyColor}; color: white; padding: 20px; text-align: center; border-radius: 5px; margin: 20px 0; }
                    .total .amount { font-size: 36px; font-weight: bold; margin: 10px 0; }
                    .contact-info { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
                    .footer { background: #333; color: white; padding: 20px; text-align: center; font-size: 12px; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="header">
                      <h1>\u2705 Confirmaci\xF3n de Aceptaci\xF3n</h1>
                    </div>
                    
                    <div class="content">
                      <div class="success-box">
                        <h2>\xA1Su presupuesto ha sido aceptado correctamente!</h2>
                        <p>Estimado/a <strong>${budget.clientName}</strong>,</p>
                        <p>Hemos recibido la aceptaci\xF3n de su presupuesto. A continuaci\xF3n le confirmamos los detalles:</p>
                      </div>

                      <div class="info-table">
                        <div class="info-row">
                          <span class="info-label">Presupuesto:</span>
                          <span class="info-value">${budget.code}</span>
                        </div>
                        <div class="info-row">
                          <span class="info-label">Tipo:</span>
                          <span class="info-value">${budget.type}</span>
                        </div>
                        <div class="info-row">
                          <span class="info-label">Fecha de aceptaci\xF3n:</span>
                          <span class="info-value">${(/* @__PURE__ */ new Date()).toLocaleDateString("es-ES", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit"
              })}</span>
                        </div>
                      </div>

                      <div class="total">
                        <div>TOTAL ACEPTADO</div>
                        <div class="amount">${Number(budget.total).toFixed(2)} \u20AC</div>
                      </div>

                      <p><strong>Pr\xF3ximos pasos:</strong></p>
                      <ul>
                        <li>Nuestro equipo se pondr\xE1 en contacto con usted en un plazo m\xE1ximo de 24-48 horas.</li>
                        <li>Coordinaremos los detalles para iniciar los servicios contratados.</li>
                        <li>Recibir\xE1 toda la documentaci\xF3n necesaria por email.</li>
                      </ul>

                      <div class="contact-info">
                        <h3>\xBFTiene alguna duda?</h3>
                        <p>No dude en contactarnos:</p>
                        <ul>
                          <li><strong>Email:</strong> ${companyEmail}</li>
                          <li><strong>Tel\xE9fono:</strong> ${companyPhone}</li>
                          <li><strong>Horario:</strong> Lunes a Viernes, 9:00 - 18:00</li>
                        </ul>
                      </div>

                      <p style="text-align: center; margin-top: 30px;">
                        <strong>Gracias por confiar en ${companyName}</strong>
                      </p>
                    </div>

                    <div class="footer">
                      <p>${companyName} - Todos los derechos reservados \xA9 ${(/* @__PURE__ */ new Date()).getFullYear()}</p>
                      <p style="margin-top: 10px; opacity: 0.8;">
                        Este es un email autom\xE1tico generado por nuestro sistema de gesti\xF3n de presupuestos.
                      </p>
                    </div>
                  </div>
                </body>
                </html>
              `
            });
            logger_default.info(`\u{1F4E7} Email de confirmaci\xF3n enviado a ${budget.clientEmail}`);
          } catch (mailError) {
            logger_default.error({ error: mailError }, "Error al enviar email de confirmaci\xF3n");
          }
        }
        if (transporter2) {
          try {
            await transporter2.sendMail({
              from: smtp.user,
              to: companyEmail,
              subject: `\u{1F389} \xA1Nuevo presupuesto aceptado! ${budget.code}`,
              html: `
                <!DOCTYPE html>
                <html>
                <head>
                  <meta charset="utf-8">
                  <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #28a745; color: white; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
                    .info-box { background: #f8f9fa; padding: 15px; border-left: 4px solid ${companyColor}; margin: 15px 0; }
                    .label { font-weight: bold; color: #666; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="header">
                      <h2 style="margin: 0;">\u{1F389} \xA1Presupuesto Aceptado!</h2>
                    </div>
                    
                    <p>Se ha aceptado un nuevo presupuesto:</p>
                    
                    <div class="info-box">
                      <p><span class="label">C\xF3digo:</span> ${budget.code}</p>
                      <p><span class="label">Cliente:</span> ${budget.clientName}</p>
                      <p><span class="label">Email:</span> ${budget.clientEmail || "No especificado"}</p>
                      <p><span class="label">Tel\xE9fono:</span> ${budget.clientPhone || "No especificado"}</p>
                      <p><span class="label">Tipo:</span> ${budget.type}</p>
                      <p><span class="label">Total:</span> ${Number(budget.total).toFixed(2)} \u20AC</p>
                      <p><span class="label">Fecha de aceptaci\xF3n:</span> ${(/* @__PURE__ */ new Date()).toLocaleString("es-ES")}</p>
                      <p><span class="label">IP:</span> ${ip || "No disponible"}</p>
                      <p><span class="label">User-Agent:</span> ${agent.substring(0, 100)}...</p>
                    </div>

                    <p><strong>Acci\xF3n requerida:</strong> Contactar con el cliente en un plazo de 24-48 horas.</p>
                    
                    <p style="margin-top: 30px; font-size: 12px; color: #666;">
                      Este es un email autom\xE1tico del sistema de gesti\xF3n de presupuestos.
                    </p>
                  </div>
                </body>
                </html>
              `
            });
            logger_default.info(`\u{1F4E7} Notificaci\xF3n interna enviada a ${companyEmail}`);
          } catch (internalMailError) {
            logger_default.error({ error: internalMailError }, "Error al enviar notificaci\xF3n interna");
          }
        }
      }
    } catch (emailError) {
      logger_default.error({ error: emailError }, "Error en proceso de emails");
    }
    res.json({ ok: true, message: "Presupuesto aceptado correctamente", budget: updatedBudget });
  } catch (err) {
    logger_default.error({ error: err }, "POST /public/budgets/:code/accept");
    res.status(500).json({ error: "Error interno" });
  }
});
router4.get("/:id/pdf", async (req, res) => {
  try {
    const { id } = req.params;
    const p = prisma_client_default;
    const budget = await p.budgets.findUnique({
      where: { id },
      include: {
        items: { orderBy: { position: "asc" } }
      }
    });
    if (!budget) return res.status(404).json({ error: "Presupuesto no encontrado" });
    const pdfResult = await createBudgetPdf(budget);
    const filepath = path4.join(process.cwd(), "uploads", "budgets", pdfResult.filename);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${budget.code || "presupuesto"}.pdf"`);
    const fileStream = fs4.createReadStream(filepath);
    fileStream.pipe(res);
    fileStream.on("error", (err) => {
      console.error("Error streaming PDF:", err);
      res.status(500).json({ error: "Error al generar PDF" });
    });
  } catch (err) {
    console.error("GET /public/budgets/:id/pdf", err);
    res.status(500).json({ error: "Error interno" });
  }
});
var public_budgets_default = router4;

// server/routes/gestoria-budgets.ts
import express5 from "express";

// server/services/gestoria-budget-service.ts
import { PrismaClient as PrismaClient8 } from "@prisma/client";

// server/services/gestoria-budget-config-service.ts
import { PrismaClient as PrismaClient6, Prisma as Prisma2 } from "@prisma/client";
var prisma6 = new PrismaClient6();
var GestoriaBudgetConfigService = class {
  /**
   * Obtener todas las configuraciones
   */
  async getAllConfigs(filters) {
    const where = {};
    if (filters?.tipo) {
      where.tipo = filters.tipo;
    }
    if (filters?.activo !== void 0) {
      where.activo = filters.activo;
    }
    const configs = await prisma6.gestoria_budget_configurations.findMany({
      where,
      orderBy: [
        { activo: "desc" },
        { fechaCreacion: "desc" }
      ]
    });
    return configs.map(this.mapPrismaToConfig);
  }
  /**
   * Obtener configuración activa por tipo
   */
  async getActiveConfig(tipo) {
    const config = await prisma6.gestoria_budget_configurations.findFirst({
      where: {
        tipo,
        activo: true
      },
      orderBy: {
        fechaCreacion: "desc"
      }
    });
    return config ? this.mapPrismaToConfig(config) : null;
  }
  /**
   * Obtener configuración por ID
   */
  async getConfigById(id) {
    const config = await prisma6.gestoria_budget_configurations.findUnique({
      where: { id }
    });
    return config ? this.mapPrismaToConfig(config) : null;
  }
  /**
   * Crear nueva configuración
   */
  async createConfig(input) {
    this.validateConfigInput(input);
    if (input.tipo) {
      await this.deactivatePreviousConfigs(input.tipo);
    }
    const config = await prisma6.gestoria_budget_configurations.create({
      data: {
        tipo: input.tipo,
        nombre: input.nombre,
        activo: true,
        precioBasePorFactura: new Prisma2.Decimal(input.precioBasePorFactura),
        precioBasePorNomina: new Prisma2.Decimal(input.precioBasePorNomina),
        porcentajeRegimenGeneral: new Prisma2.Decimal(input.porcentajeRegimenGeneral),
        porcentajeModulos: new Prisma2.Decimal(input.porcentajeModulos),
        porcentajeEDN: new Prisma2.Decimal(input.porcentajeEDN),
        recargoPeriodoMensual: new Prisma2.Decimal(input.recargoPeriodoMensual),
        minimoMensual: new Prisma2.Decimal(input.minimoMensual),
        precioModelo303: new Prisma2.Decimal(input.precioModelo303),
        precioModelo111: new Prisma2.Decimal(input.precioModelo111),
        precioModelo115: new Prisma2.Decimal(input.precioModelo115),
        precioModelo130: new Prisma2.Decimal(input.precioModelo130),
        precioModelo100: new Prisma2.Decimal(input.precioModelo100),
        precioModelo349: new Prisma2.Decimal(input.precioModelo349),
        precioModelo347: new Prisma2.Decimal(input.precioModelo347),
        precioCertificados: new Prisma2.Decimal(input.precioCertificados),
        precioCensos: new Prisma2.Decimal(input.precioCensos),
        precioNotificaciones: new Prisma2.Decimal(input.precioNotificaciones),
        precioEstadisticas: new Prisma2.Decimal(input.precioEstadisticas),
        precioAyudas: new Prisma2.Decimal(input.precioAyudas),
        nombreEmpresa: input.nombreEmpresa,
        nifEmpresa: input.nifEmpresa,
        direccionEmpresa: input.direccionEmpresa,
        telefonoEmpresa: input.telefonoEmpresa,
        emailEmpresa: input.emailEmpresa,
        logoPath: input.logoPath || null,
        colorPrimario: input.colorPrimario || "#1e40af",
        colorSecundario: input.colorSecundario || "#3b82f6",
        creadoPor: input.creadoPor
      }
    });
    return this.mapPrismaToConfig(config);
  }
  /**
   * Actualizar configuración existente
   */
  async updateConfig(id, input) {
    const existing = await prisma6.gestoria_budget_configurations.findUnique({
      where: { id }
    });
    if (!existing) {
      throw new Error("Configuraci\xF3n no encontrada");
    }
    this.validateConfigInput(input, true);
    if (input.activo === true && existing.tipo) {
      await this.deactivatePreviousConfigs(existing.tipo, id);
    }
    const data = {};
    if (input.nombre !== void 0) data.nombre = input.nombre;
    if (input.activo !== void 0) data.activo = input.activo;
    if (input.precioBasePorFactura !== void 0) data.precioBasePorFactura = new Prisma2.Decimal(input.precioBasePorFactura);
    if (input.precioBasePorNomina !== void 0) data.precioBasePorNomina = new Prisma2.Decimal(input.precioBasePorNomina);
    if (input.porcentajeRegimenGeneral !== void 0) data.porcentajeRegimenGeneral = new Prisma2.Decimal(input.porcentajeRegimenGeneral);
    if (input.porcentajeModulos !== void 0) data.porcentajeModulos = new Prisma2.Decimal(input.porcentajeModulos);
    if (input.porcentajeEDN !== void 0) data.porcentajeEDN = new Prisma2.Decimal(input.porcentajeEDN);
    if (input.recargoPeriodoMensual !== void 0) data.recargoPeriodoMensual = new Prisma2.Decimal(input.recargoPeriodoMensual);
    if (input.minimoMensual !== void 0) data.minimoMensual = new Prisma2.Decimal(input.minimoMensual);
    if (input.precioModelo303 !== void 0) data.precioModelo303 = new Prisma2.Decimal(input.precioModelo303);
    if (input.precioModelo111 !== void 0) data.precioModelo111 = new Prisma2.Decimal(input.precioModelo111);
    if (input.precioModelo115 !== void 0) data.precioModelo115 = new Prisma2.Decimal(input.precioModelo115);
    if (input.precioModelo130 !== void 0) data.precioModelo130 = new Prisma2.Decimal(input.precioModelo130);
    if (input.precioModelo100 !== void 0) data.precioModelo100 = new Prisma2.Decimal(input.precioModelo100);
    if (input.precioModelo349 !== void 0) data.precioModelo349 = new Prisma2.Decimal(input.precioModelo349);
    if (input.precioModelo347 !== void 0) data.precioModelo347 = new Prisma2.Decimal(input.precioModelo347);
    if (input.precioCertificados !== void 0) data.precioCertificados = new Prisma2.Decimal(input.precioCertificados);
    if (input.precioCensos !== void 0) data.precioCensos = new Prisma2.Decimal(input.precioCensos);
    if (input.precioNotificaciones !== void 0) data.precioNotificaciones = new Prisma2.Decimal(input.precioNotificaciones);
    if (input.precioEstadisticas !== void 0) data.precioEstadisticas = new Prisma2.Decimal(input.precioEstadisticas);
    if (input.precioAyudas !== void 0) data.precioAyudas = new Prisma2.Decimal(input.precioAyudas);
    if (input.nombreEmpresa !== void 0) data.nombreEmpresa = input.nombreEmpresa;
    if (input.nifEmpresa !== void 0) data.nifEmpresa = input.nifEmpresa;
    if (input.direccionEmpresa !== void 0) data.direccionEmpresa = input.direccionEmpresa;
    if (input.telefonoEmpresa !== void 0) data.telefonoEmpresa = input.telefonoEmpresa;
    if (input.emailEmpresa !== void 0) data.emailEmpresa = input.emailEmpresa;
    if (input.logoPath !== void 0) data.logoPath = input.logoPath;
    if (input.colorPrimario !== void 0) data.colorPrimario = input.colorPrimario;
    if (input.colorSecundario !== void 0) data.colorSecundario = input.colorSecundario;
    const config = await prisma6.gestoria_budget_configurations.update({
      where: { id },
      data
    });
    return this.mapPrismaToConfig(config);
  }
  /**
   * Eliminar configuración
   */
  async deleteConfig(id) {
    const budgetsCount = await prisma6.gestoria_budgets.count({
      where: { configId: id }
    });
    if (budgetsCount > 0) {
      throw new Error(`No se puede eliminar la configuraci\xF3n porque tiene ${budgetsCount} presupuesto(s) asociado(s)`);
    }
    await prisma6.gestoria_budget_configurations.delete({
      where: { id }
    });
  }
  /**
   * Desactivar configuraciones anteriores del mismo tipo
   */
  async deactivatePreviousConfigs(tipo, exceptId) {
    const where = {
      tipo,
      activo: true
    };
    if (exceptId) {
      where.NOT = { id: exceptId };
    }
    await prisma6.gestoria_budget_configurations.updateMany({
      where,
      data: { activo: false }
    });
  }
  /**
   * Validar input de configuración
   */
  validateConfigInput(input, isPartial = false) {
    const errors = [];
    if (!isPartial) {
      if (!input.tipo) errors.push("Tipo de gestor\xEDa requerido");
      if (!input.nombre) errors.push("Nombre de configuraci\xF3n requerido");
      if (!input.nombreEmpresa) errors.push("Nombre de empresa requerido");
      if (!input.nifEmpresa) errors.push("NIF de empresa requerido");
      if (!input.direccionEmpresa) errors.push("Direcci\xF3n de empresa requerida");
      if (!input.telefonoEmpresa) errors.push("Tel\xE9fono de empresa requerido");
      if (!input.emailEmpresa) errors.push("Email de empresa requerido");
      if (!input.creadoPor) errors.push("Usuario creador requerido");
    }
    if (input.precioBasePorFactura !== void 0 && input.precioBasePorFactura < 0) {
      errors.push("Precio base por factura debe ser mayor o igual a 0");
    }
    if (input.precioBasePorNomina !== void 0 && input.precioBasePorNomina < 0) {
      errors.push("Precio base por n\xF3mina debe ser mayor o igual a 0");
    }
    if (input.porcentajeRegimenGeneral !== void 0 && (input.porcentajeRegimenGeneral < 0 || input.porcentajeRegimenGeneral > 100)) {
      errors.push("Porcentaje de r\xE9gimen general debe estar entre 0 y 100");
    }
    if (input.porcentajeModulos !== void 0 && (input.porcentajeModulos < 0 || input.porcentajeModulos > 100)) {
      errors.push("Porcentaje de m\xF3dulos debe estar entre 0 y 100");
    }
    if (input.porcentajeEDN !== void 0 && (input.porcentajeEDN < 0 || input.porcentajeEDN > 100)) {
      errors.push("Porcentaje de EDN debe estar entre 0 y 100");
    }
    if (input.recargoPeriodoMensual !== void 0 && (input.recargoPeriodoMensual < 0 || input.recargoPeriodoMensual > 100)) {
      errors.push("Recargo per\xEDodo mensual debe estar entre 0 y 100");
    }
    if (input.emailEmpresa && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.emailEmpresa)) {
      errors.push("Email de empresa no v\xE1lido");
    }
    if (input.colorPrimario && !/^#[0-9A-Fa-f]{6}$/.test(input.colorPrimario)) {
      errors.push("Color primario debe ser un valor hexadecimal v\xE1lido (ej: #1e40af)");
    }
    if (input.colorSecundario && !/^#[0-9A-Fa-f]{6}$/.test(input.colorSecundario)) {
      errors.push("Color secundario debe ser un valor hexadecimal v\xE1lido (ej: #3b82f6)");
    }
    if (errors.length > 0) {
      throw new Error(`Errores de validaci\xF3n:
- ${errors.join("\n- ")}`);
    }
  }
  /**
   * Mapear de Prisma a interface pública
   */
  mapPrismaToConfig(prismaConfig) {
    return {
      id: prismaConfig.id,
      tipo: prismaConfig.tipo,
      nombre: prismaConfig.nombre,
      activo: prismaConfig.activo,
      precioBasePorFactura: Number(prismaConfig.precioBasePorFactura),
      precioBasePorNomina: Number(prismaConfig.precioBasePorNomina),
      porcentajeRegimenGeneral: Number(prismaConfig.porcentajeRegimenGeneral),
      porcentajeModulos: Number(prismaConfig.porcentajeModulos),
      porcentajeEDN: Number(prismaConfig.porcentajeEDN),
      recargoPeriodoMensual: Number(prismaConfig.recargoPeriodoMensual),
      minimoMensual: Number(prismaConfig.minimoMensual),
      precioModelo303: Number(prismaConfig.precioModelo303),
      precioModelo111: Number(prismaConfig.precioModelo111),
      precioModelo115: Number(prismaConfig.precioModelo115),
      precioModelo130: Number(prismaConfig.precioModelo130),
      precioModelo100: Number(prismaConfig.precioModelo100),
      precioModelo349: Number(prismaConfig.precioModelo349),
      precioModelo347: Number(prismaConfig.precioModelo347),
      precioCertificados: Number(prismaConfig.precioCertificados),
      precioCensos: Number(prismaConfig.precioCensos),
      precioNotificaciones: Number(prismaConfig.precioNotificaciones),
      precioEstadisticas: Number(prismaConfig.precioEstadisticas),
      precioAyudas: Number(prismaConfig.precioAyudas),
      nombreEmpresa: prismaConfig.nombreEmpresa,
      nifEmpresa: prismaConfig.nifEmpresa,
      direccionEmpresa: prismaConfig.direccionEmpresa,
      telefonoEmpresa: prismaConfig.telefonoEmpresa,
      emailEmpresa: prismaConfig.emailEmpresa,
      logoPath: prismaConfig.logoPath,
      colorPrimario: prismaConfig.colorPrimario,
      colorSecundario: prismaConfig.colorSecundario,
      fechaCreacion: prismaConfig.fechaCreacion,
      fechaModificacion: prismaConfig.fechaModificacion,
      creadoPor: prismaConfig.creadoPor
    };
  }
};
var gestoriaBudgetConfigService = new GestoriaBudgetConfigService();

// server/services/gestoria-budget-calculation-service.ts
import { PrismaClient as PrismaClient7 } from "@prisma/client";
var GestoriaBudgetCalculationService = class {
  /**
   * Calcular presupuesto completo
   */
  async calculate(input, tipoGestoria) {
    const config = await gestoriaBudgetConfigService.getActiveConfig(tipoGestoria);
    if (!config) {
      throw new Error(`No hay configuraci\xF3n activa para ${tipoGestoria}`);
    }
    const totalContabilidad = this.calculateTotalContabilidad(input, config);
    const totalLaboral = this.calculateTotalLaboral(input, config);
    const subtotal = totalContabilidad + totalLaboral;
    const descuentoCalculado = this.calculateDescuento(subtotal, input);
    const totalFinal = subtotal - descuentoCalculado;
    const desglose = this.calculateDesglose(input, config);
    return {
      totalContabilidad,
      totalLaboral,
      subtotal,
      descuentoCalculado,
      totalFinal,
      desglose
    };
  }
  /**
   * Calcular total de contabilidad
   * Replica la lógica de CalcularTotalContabilidad() en ASP.NET
   */
  calculateTotalContabilidad(input, config) {
    let total = 0;
    const baseFacturas = input.facturasMes * config.precioBasePorFactura;
    total += baseFacturas;
    let recargoSistema = 0;
    const facturacion = input.facturacion;
    switch (input.sistemaTributacion) {
      case "R\xE9gimen General":
        recargoSistema = facturacion * config.porcentajeRegimenGeneral / 100;
        break;
      case "M\xF3dulos":
        recargoSistema = facturacion * config.porcentajeModulos / 100;
        break;
      case "EDN":
      case "Otro":
        recargoSistema = facturacion * config.porcentajeEDN / 100;
        break;
    }
    total += recargoSistema;
    if (input.periodoDeclaraciones === "Mensual") {
      const recargoMensual = total * config.recargoPeriodoMensual / 100;
      const minimoMensual = config.minimoMensual;
      total += Math.max(recargoMensual, minimoMensual);
    }
    if (input.modelo303) total += config.precioModelo303;
    if (input.modelo111) total += config.precioModelo111;
    if (input.modelo115) total += config.precioModelo115;
    if (input.modelo130) total += config.precioModelo130;
    if (input.modelo100) total += config.precioModelo100;
    if (input.modelo349) total += config.precioModelo349;
    if (input.modelo347) total += config.precioModelo347;
    if (input.solicitudCertificados) total += config.precioCertificados;
    if (input.censosAEAT) total += config.precioCensos;
    if (input.recepcionNotificaciones) total += config.precioNotificaciones;
    if (input.estadisticasINE) total += config.precioEstadisticas;
    if (input.solicitudAyudas) total += config.precioAyudas;
    if (input.serviciosAdicionales) {
      const serviciosMensuales = input.serviciosAdicionales.filter((s) => s.tipoServicio === "MENSUAL" && s.incluido).reduce((sum, s) => sum + s.precio, 0);
      total += serviciosMensuales;
    }
    return Math.round(total * 100) / 100;
  }
  /**
   * Calcular total laboral
   * Replica la lógica de CalcularTotalLaboral() en ASP.NET
   */
  calculateTotalLaboral(input, config) {
    if (!input.conLaboralSocial || !input.nominasMes || input.nominasMes === 0) {
      return 0;
    }
    const totalLaboral = input.nominasMes * config.precioBasePorNomina;
    return Math.round(totalLaboral * 100) / 100;
  }
  /**
   * Calcular descuento
   * Replica la lógica de AplicarDescuento() en ASP.NET
   */
  calculateDescuento(subtotal, input) {
    if (!input.aplicaDescuento || !input.valorDescuento || input.valorDescuento <= 0) {
      return 0;
    }
    let descuento = 0;
    if (input.tipoDescuento === "PORCENTAJE") {
      descuento = subtotal * input.valorDescuento / 100;
    } else if (input.tipoDescuento === "FIJO") {
      descuento = input.valorDescuento;
    }
    descuento = Math.min(descuento, subtotal);
    return Math.round(descuento * 100) / 100;
  }
  /**
   * Calcular desglose detallado para mostrar en UI
   */
  calculateDesglose(input, config) {
    const baseFacturas = input.facturasMes * config.precioBasePorFactura;
    const baseNominas = input.conLaboralSocial && input.nominasMes ? input.nominasMes * config.precioBasePorNomina : 0;
    let recargoSistemaTributacion = 0;
    const facturacion = input.facturacion;
    switch (input.sistemaTributacion) {
      case "R\xE9gimen General":
        recargoSistemaTributacion = facturacion * config.porcentajeRegimenGeneral / 100;
        break;
      case "M\xF3dulos":
        recargoSistemaTributacion = facturacion * config.porcentajeModulos / 100;
        break;
      case "EDN":
      case "Otro":
        recargoSistemaTributacion = facturacion * config.porcentajeEDN / 100;
        break;
    }
    let recargoPeriodo = 0;
    if (input.periodoDeclaraciones === "Mensual") {
      const baseParaRecargo = baseFacturas + recargoSistemaTributacion;
      const recargoCalculado = baseParaRecargo * config.recargoPeriodoMensual / 100;
      recargoPeriodo = Math.max(recargoCalculado, config.minimoMensual);
    }
    let serviciosModelos = 0;
    if (input.modelo303) serviciosModelos += config.precioModelo303;
    if (input.modelo111) serviciosModelos += config.precioModelo111;
    if (input.modelo115) serviciosModelos += config.precioModelo115;
    if (input.modelo130) serviciosModelos += config.precioModelo130;
    if (input.modelo100) serviciosModelos += config.precioModelo100;
    if (input.modelo349) serviciosModelos += config.precioModelo349;
    if (input.modelo347) serviciosModelos += config.precioModelo347;
    let serviciosAdicionales = 0;
    if (input.solicitudCertificados) serviciosAdicionales += config.precioCertificados;
    if (input.censosAEAT) serviciosAdicionales += config.precioCensos;
    if (input.recepcionNotificaciones) serviciosAdicionales += config.precioNotificaciones;
    if (input.estadisticasINE) serviciosAdicionales += config.precioEstadisticas;
    if (input.solicitudAyudas) serviciosAdicionales += config.precioAyudas;
    let serviciosAdicionalesMensuales = 0;
    let serviciosAdicionalesPuntuales = 0;
    if (input.serviciosAdicionales) {
      serviciosAdicionalesMensuales = input.serviciosAdicionales.filter((s) => s.tipoServicio === "MENSUAL" && s.incluido).reduce((sum, s) => sum + s.precio, 0);
      serviciosAdicionalesPuntuales = input.serviciosAdicionales.filter((s) => s.tipoServicio === "PUNTUAL" && s.incluido).reduce((sum, s) => sum + s.precio, 0);
    }
    return {
      baseFacturas: Math.round(baseFacturas * 100) / 100,
      baseNominas: Math.round(baseNominas * 100) / 100,
      recargoSistemaTributacion: Math.round(recargoSistemaTributacion * 100) / 100,
      recargoPeriodo: Math.round(recargoPeriodo * 100) / 100,
      serviciosModelos: Math.round(serviciosModelos * 100) / 100,
      serviciosAdicionales: Math.round(serviciosAdicionales * 100) / 100,
      serviciosAdicionalesMensuales: Math.round(serviciosAdicionalesMensuales * 100) / 100,
      serviciosAdicionalesPuntuales: Math.round(serviciosAdicionalesPuntuales * 100) / 100
    };
  }
  /**
   * Generar número de presupuesto automático
   * Formato: PRE-2025-001
   */
  async generateBudgetNumber(year) {
    const currentYear = year || (/* @__PURE__ */ new Date()).getFullYear();
    const lastBudget = await prisma7.gestoria_budgets.findFirst({
      where: {
        numero: {
          startsWith: `PRE-${currentYear}-`
        }
      },
      orderBy: {
        numero: "desc"
      }
    });
    let nextNumber = 1;
    if (lastBudget) {
      const match = lastBudget.numero.match(/PRE-\d{4}-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }
    const paddedNumber = String(nextNumber).padStart(3, "0");
    return `PRE-${currentYear}-${paddedNumber}`;
  }
};
var gestoriaBudgetCalculationService = new GestoriaBudgetCalculationService();
var prisma7 = new PrismaClient7();

// server/services/gestoria-budget-service.ts
var prisma8 = new PrismaClient8();
var GestoriaBudgetService = class {
  /**
   * Crear nuevo presupuesto
   */
  async createBudget(input) {
    this.validateBudgetInput(input);
    const numero = await gestoriaBudgetCalculationService.generateBudgetNumber();
    const calculationInput = {
      facturasMes: input.facturasMes,
      nominasMes: input.nominasMes,
      facturacion: input.facturacion,
      sistemaTributacion: input.sistemaTributacion,
      periodoDeclaraciones: input.periodoDeclaraciones,
      modelo303: input.modelo303,
      modelo111: input.modelo111,
      modelo115: input.modelo115,
      modelo130: input.modelo130,
      modelo100: input.modelo100,
      modelo349: input.modelo349,
      modelo347: input.modelo347,
      solicitudCertificados: input.solicitudCertificados,
      censosAEAT: input.censosAEAT,
      recepcionNotificaciones: input.recepcionNotificaciones,
      estadisticasINE: input.estadisticasINE,
      solicitudAyudas: input.solicitudAyudas,
      conLaboralSocial: input.conLaboralSocial,
      aplicaDescuento: input.aplicaDescuento,
      tipoDescuento: input.tipoDescuento,
      valorDescuento: input.valorDescuento,
      serviciosAdicionales: input.serviciosAdicionales
    };
    const calculation = await gestoriaBudgetCalculationService.calculate(
      calculationInput,
      input.tipoGestoria
    );
    const budget = await prisma8.gestoria_budgets.create({
      data: {
        numero,
        tipoGestoria: input.tipoGestoria,
        estado: "BORRADOR",
        // Cambiado de PENDIENTE
        // Cliente
        nombreCliente: input.nombreCliente,
        nifCif: input.nifCif || null,
        email: input.email,
        telefono: input.telefono || null,
        direccion: input.direccion || null,
        personaContacto: input.personaContacto || null,
        // Negocio
        facturacion: input.facturacion,
        facturasMes: input.facturasMes,
        nominasMes: input.nominasMes || 0,
        sistemaTributacion: input.sistemaTributacion,
        periodoDeclaraciones: input.periodoDeclaraciones,
        // Modelos
        modelo303: input.modelo303 || false,
        modelo111: input.modelo111 || false,
        modelo115: input.modelo115 || false,
        modelo130: input.modelo130 || false,
        modelo100: input.modelo100 || false,
        modelo349: input.modelo349 || false,
        modelo347: input.modelo347 || false,
        // Servicios adicionales fijos
        solicitudCertificados: input.solicitudCertificados || false,
        censosAEAT: input.censosAEAT || false,
        recepcionNotificaciones: input.recepcionNotificaciones || false,
        estadisticasINE: input.estadisticasINE || false,
        solicitudAyudas: input.solicitudAyudas || false,
        // Laborales
        conLaboralSocial: input.conLaboralSocial || false,
        // Descuentos
        aplicaDescuento: input.aplicaDescuento || false,
        tipoDescuento: input.tipoDescuento || null,
        valorDescuento: input.valorDescuento || null,
        // Totales
        totalContabilidad: calculation.totalContabilidad,
        totalLaboral: calculation.totalLaboral,
        descuentoCalculado: calculation.descuentoCalculado,
        totalFinal: calculation.totalFinal,
        // Metadata
        creadoPor: input.creadoPor,
        fechaCreacion: /* @__PURE__ */ new Date(),
        // Relación con configuración
        configuracion: {
          connect: {
            id: input.configId
          }
        }
      }
    });
    if (input.serviciosAdicionales && input.serviciosAdicionales.length > 0) {
      await prisma8.gestoria_budget_additional_services.createMany({
        data: input.serviciosAdicionales.map((servicio) => ({
          budgetId: budget.id,
          nombre: servicio.nombre,
          precio: servicio.precio,
          tipoServicio: servicio.tipoServicio,
          incluido: servicio.incluido
        }))
      });
    }
    await this.logStatisticsEvent("CREADO", budget.id, budget.tipoGestoria);
    return budget;
  }
  /**
   * Obtener presupuesto por ID
   */
  async getBudgetById(id) {
    const budget = await prisma8.gestoria_budgets.findUnique({
      where: { id },
      include: {
        serviciosAdicionales: true,
        configuracion: true
      }
    });
    if (!budget) {
      throw new Error(`Presupuesto con ID ${id} no encontrado`);
    }
    return budget;
  }
  /**
   * Listar presupuestos con filtros
   */
  async listBudgets(filters = {}) {
    const where = {};
    if (filters.tipoGestoria) {
      where.tipoGestoria = filters.tipoGestoria;
    }
    if (filters.estado) {
      where.estado = filters.estado;
    }
    if (filters.nombreCliente) {
      where.nombreCliente = {
        contains: filters.nombreCliente
      };
    }
    if (filters.nifCif) {
      where.nifCif = {
        contains: filters.nifCif
      };
    }
    if (filters.email) {
      where.email = {
        contains: filters.email
      };
    }
    if (filters.fechaDesde || filters.fechaHasta) {
      where.fechaCreacion = {};
      if (filters.fechaDesde) {
        where.fechaCreacion.gte = filters.fechaDesde;
      }
      if (filters.fechaHasta) {
        where.fechaCreacion.lte = filters.fechaHasta;
      }
    }
    const budgets = await prisma8.gestoria_budgets.findMany({
      where,
      include: {
        serviciosAdicionales: true
      },
      orderBy: {
        fechaCreacion: "desc"
      }
    });
    return budgets;
  }
  /**
   * Actualizar presupuesto
   */
  async updateBudget(id, input) {
    const existing = await this.getBudgetById(id);
    if (existing.estado === "ACEPTADO" && existing.clienteId) {
      throw new Error("No se puede editar un presupuesto que ya fue aceptado y convertido a cliente");
    }
    const needsRecalculation = this.checkIfNeedsRecalculation(input);
    let updatedTotals = {};
    if (needsRecalculation) {
      const calculationInput = {
        facturasMes: input.facturasMes ?? existing.facturasMes,
        nominasMes: input.nominasMes ?? existing.nominasMes ?? void 0,
        facturacion: input.facturacion ?? Number(existing.facturacion),
        sistemaTributacion: input.sistemaTributacion ?? existing.sistemaTributacion,
        periodoDeclaraciones: input.periodoDeclaraciones ?? existing.periodoDeclaraciones,
        modelo303: input.modelo303 ?? existing.modelo303,
        modelo111: input.modelo111 ?? existing.modelo111,
        modelo115: input.modelo115 ?? existing.modelo115,
        modelo130: input.modelo130 ?? existing.modelo130,
        modelo100: input.modelo100 ?? existing.modelo100,
        modelo349: input.modelo349 ?? existing.modelo349,
        modelo347: input.modelo347 ?? existing.modelo347,
        solicitudCertificados: input.solicitudCertificados ?? existing.solicitudCertificados,
        censosAEAT: input.censosAEAT ?? existing.censosAEAT,
        recepcionNotificaciones: input.recepcionNotificaciones ?? existing.recepcionNotificaciones,
        estadisticasINE: input.estadisticasINE ?? existing.estadisticasINE,
        solicitudAyudas: input.solicitudAyudas ?? existing.solicitudAyudas,
        conLaboralSocial: input.conLaboralSocial ?? existing.conLaboralSocial,
        aplicaDescuento: input.aplicaDescuento ?? existing.aplicaDescuento,
        tipoDescuento: input.tipoDescuento ?? existing.tipoDescuento ?? void 0,
        valorDescuento: input.valorDescuento ?? (existing.valorDescuento ? Number(existing.valorDescuento) : void 0)
      };
      const calculation = await gestoriaBudgetCalculationService.calculate(
        calculationInput,
        existing.tipoGestoria
      );
      updatedTotals = {
        totalContabilidad: calculation.totalContabilidad,
        totalLaboral: calculation.totalLaboral,
        subtotal: calculation.subtotal,
        descuentoCalculado: calculation.descuentoCalculado,
        totalFinal: calculation.totalFinal
      };
    }
    const updated = await prisma8.gestoria_budgets.update({
      where: { id },
      data: {
        ...this.buildUpdateData(input),
        ...updatedTotals
      },
      include: {
        serviciosAdicionales: true
      }
    });
    if (input.serviciosAdicionales) {
      await prisma8.gestoria_budget_additional_services.deleteMany({
        where: { budgetId: id }
      });
      if (input.serviciosAdicionales.length > 0) {
        await prisma8.gestoria_budget_additional_services.createMany({
          data: input.serviciosAdicionales.map((servicio) => ({
            budgetId: id,
            nombre: servicio.nombre,
            precio: servicio.precio,
            tipoServicio: servicio.tipoServicio
          }))
        });
      }
    }
    return updated;
  }
  /**
   * Marcar presupuesto como aceptado
   */
  async acceptBudget(id) {
    const budget = await this.getBudgetById(id);
    if (budget.estado !== "BORRADOR") {
      throw new Error(`El presupuesto debe estar en estado PENDIENTE para ser aceptado`);
    }
    const updated = await prisma8.gestoria_budgets.update({
      where: { id },
      data: {
        estado: "ACEPTADO",
        fechaAceptacion: /* @__PURE__ */ new Date()
      }
    });
    await this.logStatisticsEvent("ACEPTADO", id, budget.tipoGestoria);
    return updated;
  }
  /**
   * Marcar presupuesto como rechazado
   */
  async rejectBudget(id, motivoRechazo) {
    const budget = await this.getBudgetById(id);
    if (budget.estado !== "BORRADOR") {
      throw new Error(`El presupuesto debe estar en estado PENDIENTE para ser rechazado`);
    }
    const updated = await prisma8.gestoria_budgets.update({
      where: { id },
      data: {
        estado: "RECHAZADO",
        fechaRechazo: /* @__PURE__ */ new Date(),
        motivoRechazo: motivoRechazo || null
      }
    });
    await this.logStatisticsEvent("RECHAZADO", id, budget.tipoGestoria);
    return updated;
  }
  /**
   * Eliminar presupuesto
   */
  async deleteBudget(id) {
    const budget = await this.getBudgetById(id);
    if (budget.estado === "ACEPTADO" && budget.clienteId) {
      throw new Error("No se puede eliminar un presupuesto que ya fue convertido a cliente");
    }
    await prisma8.gestoria_budget_additional_services.deleteMany({
      where: { budgetId: id }
    });
    await prisma8.gestoria_budget_statistics_events.deleteMany({
      where: { budgetId: id }
    });
    await prisma8.gestoria_budgets.delete({
      where: { id }
    });
  }
  /**
   * Obtener estadísticas de presupuestos
   */
  async getStatistics(tipo, fechaDesde, fechaHasta) {
    const where = {};
    if (tipo) {
      where.tipoGestoria = tipo;
    }
    if (fechaDesde || fechaHasta) {
      where.fechaCreacion = {};
      if (fechaDesde) where.fechaCreacion.gte = fechaDesde;
      if (fechaHasta) where.fechaCreacion.lte = fechaHasta;
    }
    const total = await prisma8.gestoria_budgets.count({ where });
    const porEstado = await prisma8.gestoria_budgets.groupBy({
      by: ["estado"],
      where,
      _count: true
    });
    const aggregates = await prisma8.gestoria_budgets.aggregate({
      where,
      _sum: {
        totalFinal: true
      },
      _avg: {
        totalFinal: true
      }
    });
    const pendientes = porEstado.find((e) => e.estado === "BORRADOR")?._count || 0;
    const aceptados = porEstado.find((e) => e.estado === "ACEPTADO")?._count || 0;
    const rechazados = porEstado.find((e) => e.estado === "RECHAZADO")?._count || 0;
    const tasaConversion = total > 0 ? aceptados / total * 100 : 0;
    return {
      total,
      pendientes,
      aceptados,
      rechazados,
      tasaConversion: Math.round(tasaConversion * 100) / 100,
      valorTotal: aggregates._sum.totalFinal || 0,
      valorPromedio: aggregates._avg.totalFinal || 0,
      porEstado: porEstado.map((e) => ({
        estado: e.estado,
        cantidad: e._count
      }))
    };
  }
  // ===== MÉTODOS PRIVADOS =====
  validateBudgetInput(input) {
    if (!input.nombreCliente || input.nombreCliente.trim().length === 0) {
      throw new Error("El nombre completo es obligatorio");
    }
    if (input.facturacion < 0) {
      throw new Error("La facturaci\xF3n no puede ser negativa");
    }
    if (input.facturasMes < 0) {
      throw new Error("El n\xFAmero de facturas no puede ser negativo");
    }
    if (input.nominasMes && input.nominasMes < 0) {
      throw new Error("El n\xFAmero de n\xF3minas no puede ser negativo");
    }
    if (input.email && !this.isValidEmail(input.email)) {
      throw new Error("El formato del email no es v\xE1lido");
    }
  }
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  calculateValidityDate() {
    const date = /* @__PURE__ */ new Date();
    date.setDate(date.getDate() + 30);
    return date;
  }
  checkIfNeedsRecalculation(input) {
    const calculationFields = [
      "facturasMes",
      "nominasMes",
      "facturacion",
      "sistemaTributacion",
      "periodoDeclaraciones",
      "modelo303",
      "modelo111",
      "modelo115",
      "modelo130",
      "modelo100",
      "modelo349",
      "modelo347",
      "solicitudCertificados",
      "censosAEAT",
      "recepcionNotificaciones",
      "estadisticasINE",
      "solicitudAyudas",
      "conLaboralSocial",
      "aplicaDescuento",
      "tipoDescuento",
      "valorDescuento",
      "serviciosAdicionales"
    ];
    return calculationFields.some((field) => field in input);
  }
  buildUpdateData(input) {
    const data = {};
    const simpleFields = [
      "nombreCliente",
      "nifCif",
      "email",
      "telefono",
      "direccion",
      "personaContacto",
      "facturacion",
      "facturasMes",
      "nominasMes",
      "sistemaTributacion",
      "periodoDeclaraciones",
      "modelo303",
      "modelo111",
      "modelo115",
      "modelo130",
      "modelo100",
      "modelo349",
      "modelo347",
      "solicitudCertificados",
      "censosAEAT",
      "recepcionNotificaciones",
      "estadisticasINE",
      "solicitudAyudas",
      "conLaboralSocial",
      "aplicaDescuento",
      "tipoDescuento",
      "valorDescuento",
      "estado",
      "motivoRechazo",
      "tipoGestoria"
    ];
    for (const field of simpleFields) {
      if (field in input) {
        data[field] = input[field];
      }
    }
    return data;
  }
  async logStatisticsEvent(evento, budgetId, tipoGestoria, userId) {
    const data = {
      budgetId,
      evento,
      fecha: /* @__PURE__ */ new Date()
    };
    if (userId) data.userId = userId;
    await prisma8.gestoria_budget_statistics_events.create({
      data
    });
  }
};
var gestoriaBudgetService = new GestoriaBudgetService();

// server/services/gestoria-budget-email-service.ts
import nodemailer4 from "nodemailer";
import { PrismaClient as PrismaClient10 } from "@prisma/client";

// server/services/gestoria-budget-pdf-service.ts
import puppeteer2 from "puppeteer";
import { PrismaClient as PrismaClient9 } from "@prisma/client";
var prisma9 = new PrismaClient9();
var GestoriaBudgetPDFService = class {
  /**
   * Generar PDF del presupuesto
   */
  async generatePDF(data) {
    const config = await gestoriaBudgetConfigService.getActiveConfig(data.tipo);
    if (!config) {
      throw new Error(`No hay configuraci\xF3n activa para ${data.tipo}`);
    }
    const template = await this.getTemplate(data.tipo, "AUTONOMO");
    if (!template) {
      throw new Error(
        `\u274C No existe una plantilla activa para generar el PDF.
Por favor, crea una plantilla en la secci\xF3n de "Plantillas de Presupuestos".
Tipo: AUTONOMO | Empresa: ${data.tipo === "ASESORIA_LA_LLAVE" ? "LA_LLAVE" : "GESTORIA_ONLINE"}`
      );
    }
    const html = this.generateHTMLFromTemplate(data, config, template);
    const browser = await puppeteer2.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--single-process",
        "--disable-gpu"
      ],
      timeout: 6e4
    });
    try {
      const page = await browser.newPage();
      await page.setContent(html, {
        waitUntil: "load",
        timeout: 6e4
      });
      const pdf = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: {
          top: "0px",
          right: "0px",
          bottom: "0px",
          left: "0px"
        }
      });
      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }
  /**
   * Buscar plantilla personalizada en la BD
   */
  async getTemplate(tipo, budgetType = "AUTONOMO") {
    try {
      const companyBrand = tipo === "ASESORIA_LA_LLAVE" ? "LA_LLAVE" : "GESTORIA_ONLINE";
      const template = await prisma9.budget_templates.findFirst({
        where: {
          type: budgetType,
          companyBrand,
          isDefault: true,
          isActive: true
        },
        orderBy: {
          updatedAt: "desc"
        }
      });
      return template;
    } catch (error) {
      console.error("Error al buscar plantilla:", error);
      return null;
    }
  }
  /**
   * Generar HTML usando plantilla de BD
   */
  generateHTMLFromTemplate(data, config, template) {
    const variables = this.prepareTemplateVariables(data, config);
    let html = this.replaceVariables(template.htmlContent, variables);
    if (template.customCss) {
      if (html.includes("<style>")) {
        html = html.replace("</style>", `
${template.customCss}
</style>`);
      } else {
        html = `<style>${template.customCss}</style>
${html}`;
      }
    }
    if (!html.toLowerCase().includes("<!doctype") && !html.toLowerCase().includes("<html")) {
      html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Presupuesto ${data.numero}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
  </style>
</head>
<body>
  ${html}
</body>
</html>`;
    }
    return html;
  }
  /**
   * Preparar variables para la plantilla
   */
  prepareTemplateVariables(data, config) {
    const formatCurrency2 = (value) => value.toLocaleString("es-ES", { style: "currency", currency: "EUR" });
    const formatDate2 = (date) => date.toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" });
    const formatDateShort = (date) => date.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
    const serviciosContabilidadHTML = data.serviciosContabilidad.map((s) => `<tr><td>${s.concepto}</td></tr>`).join("");
    const serviciosLaboralesHTML = data.serviciosLaborales.map((s) => `<tr><td>${s.concepto}</td></tr>`).join("");
    const serviciosAdicionalesHTML = data.serviciosAdicionales.map((s) => `<tr><td>${s.nombre}</td><td>${s.tipoServicio === "MENSUAL" ? "Mensual" : "Puntual"}</td></tr>`).join("");
    const iva = data.totalFinal * 0.21 / 1.21;
    const subtotalSinIva = data.totalFinal - iva;
    return {
      // Presupuesto - Variables en MAYÚSCULAS (formato antiguo)
      "{{NUMERO}}": data.numero,
      "{{FECHA}}": formatDate2(data.fecha),
      "{{FECHA_VALIDEZ}}": formatDate2(data.fechaValidez),
      "{{TIPO}}": data.tipo === "ASESORIA_LA_LLAVE" ? "Asesor\xEDa La Llave" : "Gestor\xEDa Online",
      // Presupuesto - Variables en minúsculas (formato nuevo)
      "{{codigo}}": data.numero,
      "{{fecha}}": formatDateShort(data.fecha),
      "{{empresa}}": data.tipo === "ASESORIA_LA_LLAVE" ? "Asesor\xEDa La Llave" : "Gestor\xEDa Online",
      // Cliente - MAYÚSCULAS
      "{{NOMBRE_CLIENTE}}": data.nombreCompleto,
      "{{CIF_NIF}}": data.cifNif || "",
      "{{EMAIL}}": data.email || "",
      "{{TELEFONO}}": data.telefono || "",
      "{{DIRECCION}}": data.direccion || "",
      "{{CODIGO_POSTAL}}": data.codigoPostal || "",
      "{{CIUDAD}}": data.ciudad || "",
      "{{PROVINCIA}}": data.provincia || "",
      // Cliente - minúsculas
      "{{nombre_contacto}}": data.nombreCompleto,
      "{{email}}": data.email || "",
      "{{telefono}}": data.telefono || "",
      "{{direccion}}": data.direccion || "",
      // Negocio - MAYÚSCULAS
      "{{ACTIVIDAD}}": data.actividadEmpresarial || "",
      "{{FACTURACION}}": formatCurrency2(data.facturacion),
      "{{FACTURAS_MES}}": data.facturasMes.toString(),
      "{{NOMINAS_MES}}": data.nominasMes?.toString() || "0",
      "{{SISTEMA_TRIBUTACION}}": data.sistemaTributacion,
      "{{PERIODO_DECLARACIONES}}": data.periodoDeclaraciones,
      // Negocio - minúsculas
      "{{actividad}}": data.actividadEmpresarial || "",
      "{{facturacion_anual}}": formatCurrency2(data.facturacion),
      "{{num_facturas}}": data.facturasMes.toString(),
      "{{sistema_tributacion}}": data.sistemaTributacion,
      "{{nominas_mes}}": data.nominasMes?.toString() || "0",
      // Servicios (SIN PRECIOS INDIVIDUALES)
      "{{SERVICIOS_CONTABILIDAD}}": serviciosContabilidadHTML || "<tr><td>No aplica</td></tr>",
      "{{SERVICIOS_LABORALES}}": serviciosLaboralesHTML || "<tr><td>No aplica</td></tr>",
      "{{SERVICIOS_ADICIONALES}}": serviciosAdicionalesHTML || "<tr><td>No aplica</td></tr>",
      // Totales - MAYÚSCULAS
      "{{TOTAL_CONTABILIDAD}}": formatCurrency2(data.totalContabilidad),
      "{{TOTAL_LABORAL}}": formatCurrency2(data.totalLaboral),
      "{{SUBTOTAL}}": formatCurrency2(data.subtotal),
      "{{DESCUENTO}}": formatCurrency2(data.descuentoCalculado),
      "{{TOTAL_FINAL}}": formatCurrency2(data.totalFinal),
      // Totales - minúsculas
      "{{subtotal}}": formatCurrency2(subtotalSinIva),
      "{{iva}}": formatCurrency2(iva),
      "{{total}}": formatCurrency2(data.totalFinal),
      // Descuento
      "{{TIENE_DESCUENTO}}": data.aplicaDescuento ? "S\xED" : "No",
      "{{TIPO_DESCUENTO}}": data.tipoDescuento || "",
      "{{VALOR_DESCUENTO}}": data.valorDescuento?.toString() || "0",
      "{{MOTIVO_DESCUENTO}}": data.motivoDescuento || "",
      // Observaciones
      "{{OBSERVACIONES}}": data.observaciones || "",
      "{{observaciones}}": data.observaciones || "",
      // Branding
      "{{COLOR_PRIMARIO}}": config.colorPrimario || "#2563eb",
      "{{COLOR_SECUNDARIO}}": config.colorSecundario || "#1e40af",
      "{{LOGO_URL}}": config.logoUrl || "",
      "{{NOMBRE_EMPRESA}}": config.nombre || data.tipo
    };
  }
  /**
   * Reemplazar variables en el template
   */
  replaceVariables(html, variables) {
    let result = html;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
      result = result.replace(regex, value || "");
    }
    return result;
  }
  /**
   * Generar HTML completo del PDF
   */
  generateHTML(data, config) {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Presupuesto ${data.numero}</title>
  <style>
    ${this.getStyles(config)}
  </style>
</head>
<body>
  ${this.generateCoverPage(data, config)}
  ${this.generateServicesPage(data, config)}
  ${this.generateSummaryPage(data, config)}
</body>
</html>
    `;
  }
  /**
   * Estilos CSS del PDF
   */
  getStyles(config) {
    const primaryColor = config.colorPrimario || "#2563eb";
    const secondaryColor = config.colorSecundario || "#1e40af";
    return `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: 'Arial', 'Helvetica', sans-serif;
        font-size: 10pt;
        line-height: 1.6;
        color: #333;
      }
      
      .page {
        width: 210mm;
        min-height: 297mm;
        padding: 20mm;
        background: white;
        page-break-after: always;
        position: relative;
      }
      
      .page:last-child {
        page-break-after: auto;
      }
      
      /* PORTADA */
      .cover-page {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%);
        color: white;
      }
      
      .cover-header {
        text-align: center;
        padding-top: 40mm;
      }
      
      .cover-logo {
        font-size: 48pt;
        font-weight: bold;
        margin-bottom: 10mm;
        text-transform: uppercase;
        letter-spacing: 3px;
      }
      
      .cover-title {
        font-size: 36pt;
        font-weight: bold;
        margin-bottom: 5mm;
      }
      
      .cover-subtitle {
        font-size: 18pt;
        opacity: 0.9;
        margin-bottom: 20mm;
      }
      
      .cover-info {
        background: rgba(255, 255, 255, 0.1);
        padding: 15mm;
        border-radius: 5px;
        backdrop-filter: blur(10px);
      }
      
      .cover-info-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
        font-size: 12pt;
      }
      
      .cover-info-label {
        font-weight: bold;
      }
      
      .cover-footer {
        text-align: center;
        padding-bottom: 10mm;
        opacity: 0.8;
      }
      
      /* CABECERA DE P\xC1GINAS */
      .page-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-bottom: 10mm;
        margin-bottom: 10mm;
        border-bottom: 3px solid ${primaryColor};
      }
      
      .header-left {
        flex: 1;
      }
      
      .header-company {
        font-size: 20pt;
        font-weight: bold;
        color: ${primaryColor};
        margin-bottom: 2mm;
      }
      
      .header-contact {
        font-size: 9pt;
        color: #666;
      }
      
      .header-right {
        text-align: right;
      }
      
      .header-budget-number {
        font-size: 14pt;
        font-weight: bold;
        color: ${primaryColor};
      }
      
      .header-date {
        font-size: 9pt;
        color: #666;
      }
      
      /* CLIENTE */
      .client-info {
        background: #f8f9fa;
        padding: 10mm;
        border-radius: 5px;
        margin-bottom: 10mm;
      }
      
      .client-title {
        font-size: 14pt;
        font-weight: bold;
        color: ${primaryColor};
        margin-bottom: 5mm;
      }
      
      .client-row {
        display: flex;
        margin-bottom: 3mm;
      }
      
      .client-label {
        font-weight: bold;
        width: 40mm;
        color: #666;
      }
      
      .client-value {
        flex: 1;
      }
      
      /* TABLA DE SERVICIOS */
      .services-section {
        margin-bottom: 10mm;
      }
      
      .section-title {
        font-size: 14pt;
        font-weight: bold;
        color: ${primaryColor};
        margin-bottom: 5mm;
        padding-bottom: 2mm;
        border-bottom: 2px solid ${primaryColor};
      }
      
      .services-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 5mm;
      }
      
      .services-table th {
        background: ${primaryColor};
        color: white;
        padding: 3mm;
        text-align: left;
        font-weight: bold;
      }
      
      .services-table td {
        padding: 2.5mm 3mm;
        border-bottom: 1px solid #e5e7eb;
      }
      
      .services-table tr:hover {
        background: #f8f9fa;
      }
      
      .text-right {
        text-align: right;
      }
      
      .text-center {
        text-align: center;
      }
      
      .subtotal-row {
        background: #f8f9fa;
        font-weight: bold;
      }
      
      /* TOTALES */
      .totals-section {
        margin-top: 10mm;
        display: flex;
        justify-content: flex-end;
      }
      
      .totals-box {
        width: 70mm;
        background: #f8f9fa;
        padding: 5mm;
        border-radius: 5px;
      }
      
      .total-row {
        display: flex;
        justify-content: space-between;
        padding: 2mm 0;
      }
      
      .total-label {
        font-weight: bold;
        color: #666;
      }
      
      .total-value {
        font-weight: bold;
      }
      
      .total-discount {
        color: #dc2626;
      }
      
      .total-final-row {
        border-top: 2px solid ${primaryColor};
        margin-top: 2mm;
        padding-top: 3mm;
        font-size: 14pt;
      }
      
      .total-final-value {
        color: ${primaryColor};
        font-size: 18pt;
      }
      
      /* OBSERVACIONES */
      .observations-section {
        margin-top: 10mm;
        padding: 5mm;
        background: #fffbeb;
        border-left: 4px solid #f59e0b;
        border-radius: 3px;
      }
      
      .observations-title {
        font-weight: bold;
        color: #f59e0b;
        margin-bottom: 2mm;
      }
      
      /* T\xC9RMINOS Y CONDICIONES */
      .terms-section {
        margin-top: 10mm;
        padding: 5mm;
        background: #f8f9fa;
        border-radius: 5px;
        font-size: 9pt;
      }
      
      .terms-title {
        font-size: 12pt;
        font-weight: bold;
        color: ${primaryColor};
        margin-bottom: 3mm;
      }
      
      .terms-list {
        list-style-position: inside;
        line-height: 1.8;
      }
      
      .terms-list li {
        margin-bottom: 2mm;
      }
      
      /* PIE DE P\xC1GINA */
      .page-footer {
        position: absolute;
        bottom: 10mm;
        left: 20mm;
        right: 20mm;
        text-align: center;
        font-size: 8pt;
        color: #666;
        padding-top: 5mm;
        border-top: 1px solid #e5e7eb;
      }
      
      .badge {
        display: inline-block;
        padding: 2mm 4mm;
        background: ${primaryColor};
        color: white;
        border-radius: 3px;
        font-size: 9pt;
        font-weight: bold;
      }
      
      .highlight {
        background: #fef3c7;
        padding: 1mm 2mm;
        border-radius: 2px;
      }
    `;
  }
  /**
   * Generar página de portada
   */
  generateCoverPage(data, config) {
    const companyName = data.tipo === "ASESORIA_LA_LLAVE" ? config.nombreEmpresaOficial : config.nombreEmpresaOnline;
    return `
    <div class="page cover-page">
      <div class="cover-header">
        <div class="cover-logo">${companyName}</div>
        <div class="cover-title">PRESUPUESTO</div>
        <div class="cover-subtitle">N\xBA ${data.numero}</div>
      </div>
      
      <div class="cover-info">
        <div class="cover-info-row">
          <span class="cover-info-label">Cliente:</span>
          <span>${data.nombreCompleto}</span>
        </div>
        ${data.cifNif ? `
        <div class="cover-info-row">
          <span class="cover-info-label">CIF/NIF:</span>
          <span>${data.cifNif}</span>
        </div>
        ` : ""}
        <div class="cover-info-row">
          <span class="cover-info-label">Fecha:</span>
          <span>${this.formatDate(data.fecha)}</span>
        </div>
        <div class="cover-info-row">
          <span class="cover-info-label">V\xE1lido hasta:</span>
          <span>${this.formatDate(data.fechaValidez)}</span>
        </div>
        <div class="cover-info-row" style="margin-top: 5mm; font-size: 16pt;">
          <span class="cover-info-label">Importe Total:</span>
          <span style="font-weight: bold;">${this.formatCurrency(data.totalFinal)}</span>
        </div>
      </div>
      
      <div class="cover-footer">
        <p>${config.direccionEmpresa || ""}</p>
        <p>${config.emailEmpresa || ""} \u2022 ${config.telefonoEmpresa || ""}</p>
      </div>
    </div>
    `;
  }
  /**
   * Generar página de servicios
   */
  generateServicesPage(data, config) {
    const companyName = data.tipo === "ASESORIA_LA_LLAVE" ? config.nombreEmpresaOficial : config.nombreEmpresaOnline;
    return `
    <div class="page">
      ${this.generatePageHeader(data, config, companyName)}
      
      ${this.generateClientInfo(data)}
      
      <!-- SERVICIOS DE CONTABILIDAD -->
      ${data.serviciosContabilidad.length > 0 ? `
      <div class="services-section">
        <h2 class="section-title">\u{1F4CA} Servicios de Contabilidad</h2>
        <table class="services-table">
          <thead>
            <tr>
              <th style="width: 85%;">Concepto</th>
              <th style="width: 15%;" class="text-center">Cantidad</th>
            </tr>
          </thead>
          <tbody>
            ${data.serviciosContabilidad.map((s) => `
              <tr>
                <td>${s.concepto}</td>
                <td class="text-center">${s.cantidad || "-"}</td>
              </tr>
            `).join("")}
            <tr class="subtotal-row">
              <td class="text-right">Subtotal Contabilidad:</td>
              <td class="text-right">${this.formatCurrency(data.totalContabilidad)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      ` : ""}
      
      <!-- SERVICIOS LABORALES -->
      ${data.serviciosLaborales.length > 0 ? `
      <div class="services-section">
        <h2 class="section-title">\u{1F465} Servicios Laborales</h2>
        <table class="services-table">
          <thead>
            <tr>
              <th style="width: 85%;">Concepto</th>
              <th style="width: 15%;" class="text-center">Cantidad</th>
            </tr>
          </thead>
          <tbody>
            ${data.serviciosLaborales.map((s) => `
              <tr>
                <td>${s.concepto}</td>
                <td class="text-center">${s.cantidad || "-"}</td>
              </tr>
            `).join("")}
            <tr class="subtotal-row">
              <td class="text-right">Subtotal Laboral:</td>
              <td class="text-right">${this.formatCurrency(data.totalLaboral)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      ` : ""}
      
      <!-- SERVICIOS ADICIONALES -->
      ${data.serviciosAdicionales.length > 0 ? `
      <div class="services-section">
        <h2 class="section-title">\u2B50 Servicios Adicionales</h2>
        <table class="services-table">
          <thead>
            <tr>
              <th style="width: 80%;">Concepto</th>
              <th style="width: 20%;" class="text-center">Tipo</th>
            </tr>
          </thead>
          <tbody>
            ${data.serviciosAdicionales.map((s) => `
              <tr>
                <td>${s.nombre}</td>
                <td class="text-center">
                  <span class="badge">${s.tipoServicio === "MENSUAL" ? "Mensual" : "Puntual"}</span>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
      ` : ""}
      
      ${this.generatePageFooter(config)}
    </div>
    `;
  }
  /**
   * Generar página de resumen y términos
   */
  generateSummaryPage(data, config) {
    const companyName = data.tipo === "ASESORIA_LA_LLAVE" ? config.nombreEmpresaOficial : config.nombreEmpresaOnline;
    return `
    <div class="page">
      ${this.generatePageHeader(data, config, companyName)}
      
      <!-- TOTALES -->
      <div class="totals-section">
        <div class="totals-box">
          ${data.totalContabilidad > 0 ? `
          <div class="total-row">
            <span class="total-label">Contabilidad:</span>
            <span class="total-value">${this.formatCurrency(data.totalContabilidad)}</span>
          </div>
          ` : ""}
          
          ${data.totalLaboral > 0 ? `
          <div class="total-row">
            <span class="total-label">Laboral:</span>
            <span class="total-value">${this.formatCurrency(data.totalLaboral)}</span>
          </div>
          ` : ""}
          
          <div class="total-row">
            <span class="total-label">Subtotal:</span>
            <span class="total-value">${this.formatCurrency(data.subtotal)}</span>
          </div>
          
          ${data.aplicaDescuento && data.descuentoCalculado > 0 ? `
          <div class="total-row">
            <span class="total-label">Descuento ${data.tipoDescuento === "PORCENTAJE" ? `(${data.valorDescuento}%)` : ""}:</span>
            <span class="total-value total-discount">-${this.formatCurrency(data.descuentoCalculado)}</span>
          </div>
          ` : ""}
          
          <div class="total-row total-final-row">
            <span class="total-label">TOTAL:</span>
            <span class="total-value total-final-value">${this.formatCurrency(data.totalFinal)}</span>
          </div>
        </div>
      </div>
      
      ${data.motivoDescuento ? `
      <div class="observations-section">
        <div class="observations-title">\u{1F4A1} Descuento Aplicado:</div>
        <div>${data.motivoDescuento}</div>
      </div>
      ` : ""}
      
      ${data.observaciones ? `
      <div class="observations-section" style="margin-top: 5mm;">
        <div class="observations-title">\u{1F4DD} Observaciones:</div>
        <div>${data.observaciones}</div>
      </div>
      ` : ""}
      
      <!-- T\xC9RMINOS Y CONDICIONES -->
      <div class="terms-section">
        <h2 class="terms-title">T\xE9rminos y Condiciones</h2>
        <ol class="terms-list">
          <li><strong>Validez del presupuesto:</strong> Este presupuesto tiene validez hasta el ${this.formatDate(data.fechaValidez)}.</li>
          <li><strong>Servicios mensuales:</strong> Los servicios mensuales se facturar\xE1n de forma recurrente cada mes.</li>
          <li><strong>Servicios puntuales:</strong> Los servicios puntuales se facturar\xE1n \xFAnicamente cuando se realicen.</li>
          <li><strong>Forma de pago:</strong> El pago se realizar\xE1 mediante domiciliaci\xF3n bancaria o transferencia seg\xFAn se acuerde.</li>
          <li><strong>Modificaci\xF3n de servicios:</strong> Cualquier modificaci\xF3n de los servicios contratados deber\xE1 ser comunicada con un m\xEDnimo de 15 d\xEDas de antelaci\xF3n.</li>
          <li><strong>Documentaci\xF3n:</strong> El cliente se compromete a facilitar toda la documentaci\xF3n necesaria en los plazos establecidos.</li>
          <li><strong>IVA:</strong> Los precios mostrados no incluyen IVA (21% seg\xFAn legislaci\xF3n vigente).</li>
          <li><strong>Aceptaci\xF3n:</strong> La aceptaci\xF3n de este presupuesto implica la aceptaci\xF3n de estos t\xE9rminos y condiciones.</li>
        </ol>
      </div>
      
      ${this.generatePageFooter(config)}
    </div>
    `;
  }
  /**
   * Generar cabecera de página (excepto portada)
   */
  generatePageHeader(data, config, companyName) {
    return `
    <div class="page-header">
      <div class="header-left">
        <div class="header-company">${companyName}</div>
        <div class="header-contact">
          ${config.emailEmpresa || ""} \u2022 ${config.telefonoEmpresa || ""}
        </div>
      </div>
      <div class="header-right">
        <div class="header-budget-number">Presupuesto ${data.numero}</div>
        <div class="header-date">${this.formatDate(data.fecha)}</div>
      </div>
    </div>
    `;
  }
  /**
   * Generar información del cliente
   */
  generateClientInfo(data) {
    return `
    <div class="client-info">
      <h2 class="client-title">Datos del Cliente</h2>
      <div class="client-row">
        <span class="client-label">Nombre/Raz\xF3n Social:</span>
        <span class="client-value">${data.nombreCompleto}</span>
      </div>
      ${data.cifNif ? `
      <div class="client-row">
        <span class="client-label">CIF/NIF:</span>
        <span class="client-value">${data.cifNif}</span>
      </div>
      ` : ""}
      ${data.email ? `
      <div class="client-row">
        <span class="client-label">Email:</span>
        <span class="client-value">${data.email}</span>
      </div>
      ` : ""}
      ${data.telefono ? `
      <div class="client-row">
        <span class="client-label">Tel\xE9fono:</span>
        <span class="client-value">${data.telefono}</span>
      </div>
      ` : ""}
      ${data.direccion ? `
      <div class="client-row">
        <span class="client-label">Direcci\xF3n:</span>
        <span class="client-value">${data.direccion}${data.codigoPostal ? `, ${data.codigoPostal}` : ""}${data.ciudad ? `, ${data.ciudad}` : ""}${data.provincia ? ` (${data.provincia})` : ""}</span>
      </div>
      ` : ""}
      ${data.actividadEmpresarial ? `
      <div class="client-row">
        <span class="client-label">Actividad:</span>
        <span class="client-value">${data.actividadEmpresarial}</span>
      </div>
      ` : ""}
    </div>
    `;
  }
  /**
   * Generar pie de página
   */
  generatePageFooter(config) {
    return `
    <div class="page-footer">
      <p>${config.direccionEmpresa || ""}</p>
      <p>${config.emailEmpresa || ""} \u2022 ${config.telefonoEmpresa || ""}</p>
      <p style="margin-top: 2mm; font-size: 7pt;">
        Este presupuesto ha sido generado de forma autom\xE1tica. Para cualquier consulta, contacte con nosotros.
      </p>
    </div>
    `;
  }
  // ===== UTILIDADES =====
  formatDate(date) {
    return new Date(date).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  }
  formatCurrency(amount) {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR"
    }).format(amount);
  }
};
var gestoriaBudgetPDFService = new GestoriaBudgetPDFService();

// server/services/gestoria-budget-email-service.ts
var prisma10 = new PrismaClient10();
var GestoriaBudgetEmailService = class {
  constructor() {
    this.transporter = null;
  }
  /**
   * Inicializar transporter de nodemailer
   */
  async getTransporter() {
    if (this.transporter) {
      return this.transporter;
    }
    this.transporter = nodemailer4.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    return this.transporter;
  }
  /**
   * Enviar presupuesto por email
   */
  async sendBudgetEmail(budgetId, options = {}) {
    const budget = await prisma10.gestoria_budgets.findUnique({
      where: { id: budgetId },
      include: {
        serviciosAdicionales: true
      }
    });
    if (!budget) {
      throw new Error(`Presupuesto con ID ${budgetId} no encontrado`);
    }
    const config = await gestoriaBudgetConfigService.getActiveConfig(budget.tipoGestoria);
    if (!config) {
      throw new Error(`No hay configuraci\xF3n activa para ${budget.tipoGestoria}`);
    }
    const pdfData = {
      numero: budget.numero,
      fecha: budget.fechaCreacion,
      fechaValidez: new Date(budget.fechaCreacion.getTime() + 30 * 24 * 60 * 60 * 1e3),
      tipo: budget.tipoGestoria,
      nombreCompleto: budget.nombreCliente,
      cifNif: budget.nifCif || void 0,
      email: budget.email || void 0,
      telefono: budget.telefono || void 0,
      direccion: budget.direccion || void 0,
      codigoPostal: budget.personaContacto || void 0,
      ciudad: budget.direccion || void 0,
      provincia: budget.direccion || void 0,
      actividadEmpresarial: budget.sistemaTributacion || void 0,
      facturacion: Number(budget.facturacion),
      facturasMes: budget.facturasMes,
      nominasMes: budget.nominasMes || void 0,
      sistemaTributacion: budget.sistemaTributacion,
      periodoDeclaraciones: budget.periodoDeclaraciones,
      serviciosContabilidad: this.buildServicesForPDF(budget, config, "contabilidad"),
      serviciosLaborales: this.buildServicesForPDF(budget, config, "laboral"),
      serviciosAdicionales: budget.serviciosAdicionales?.map((s) => ({
        nombre: s.nombre,
        precio: Number(s.precio),
        tipoServicio: s.tipoServicio
      })) || [],
      totalContabilidad: Number(budget.totalContabilidad),
      totalLaboral: Number(budget.totalLaboral),
      subtotal: Number(budget.totalContabilidad) + Number(budget.totalLaboral),
      descuentoCalculado: Number(budget.descuentoCalculado),
      totalFinal: Number(budget.totalFinal),
      aplicaDescuento: budget.aplicaDescuento,
      tipoDescuento: budget.tipoDescuento || void 0,
      valorDescuento: Number(budget.valorDescuento) || void 0,
      motivoDescuento: budget.tipoDescuento || void 0,
      observaciones: budget.direccion || void 0
    };
    const pdfBuffer = await gestoriaBudgetPDFService.generatePDF(pdfData);
    const companyName = budget.tipoGestoria === "ASESORIA_LA_LLAVE" ? config.nombreEmpresa : config.nombreEmpresa;
    const subject = options.subject || `Presupuesto ${budget.numero} - ${companyName}`;
    const htmlBody = this.buildEmailHTML(budget, config, options.customMessage);
    const transporter2 = await this.getTransporter();
    const mailOptions = {
      from: `${companyName} <${process.env.SMTP_USER}>`,
      to: options.to,
      cc: options.cc,
      subject,
      html: htmlBody,
      attachments: [
        {
          filename: `Presupuesto_${budget.numero}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf"
        }
      ]
    };
    await transporter2.sendMail(mailOptions);
    await this.logEmailSend(budgetId, options.to, options.cc);
    await prisma10.gestoria_budgets.update({
      where: { id: budgetId },
      data: {
        fechaEnvio: /* @__PURE__ */ new Date()
      }
    });
    await prisma10.gestoria_budget_statistics_events.create({
      data: {
        budgetId,
        tipoGestoria: budget.tipoGestoria,
        evento: "SENT",
        fecha: /* @__PURE__ */ new Date()
      }
    });
  }
  /**
   * Construir servicios para el PDF
   */
  buildServicesForPDF(budget, config, tipo) {
    const servicios = [];
    if (tipo === "contabilidad") {
      if (budget.facturasMes > 0) {
        const total = budget.facturasMes * config.precioBasePorFactura;
        servicios.push({
          concepto: "Gesti\xF3n de facturas",
          cantidad: budget.facturasMes,
          precio: config.precioBasePorFactura,
          total
        });
      }
      if (Number(budget.facturacion) > 0) {
        let porcentaje = 0;
        switch (budget.sistemaTributacion) {
          case "R\xE9gimen General":
            porcentaje = config.porcentajeRegimenGeneral;
            break;
          case "M\xF3dulos":
            porcentaje = config.porcentajeModulos;
            break;
          case "EDN":
            porcentaje = config.porcentajeEDN;
            break;
        }
        if (porcentaje > 0) {
          const total = Number(budget.facturacion) * porcentaje / 100;
          servicios.push({
            concepto: `Recargo ${budget.sistemaTributacion} (${porcentaje}% sobre ${this.formatCurrency(Number(budget.facturacion))})`,
            precio: total,
            total
          });
        }
      }
      if (budget.periodoDeclaraciones === "Mensual") {
        const baseParaRecargo = servicios.reduce((sum, s) => sum + s.total, 0);
        const recargoCalculado = baseParaRecargo * config.recargoPeriodoMensual / 100;
        const recargo = Math.max(recargoCalculado, config.minimoMensual);
        servicios.push({
          concepto: `Recargo per\xEDodo mensual (${config.recargoPeriodoMensual}%, m\xEDn. ${this.formatCurrency(config.minimoMensual)})`,
          precio: recargo,
          total: recargo
        });
      }
      if (budget.modelo303) {
        servicios.push({
          concepto: "Modelo 303 (IVA)",
          precio: config.precioModelo303,
          total: config.precioModelo303
        });
      }
      if (budget.modelo111) {
        servicios.push({
          concepto: "Modelo 111 (Retenciones IRPF)",
          precio: config.precioModelo111,
          total: config.precioModelo111
        });
      }
      if (budget.modelo115) {
        servicios.push({
          concepto: "Modelo 115 (Retenciones alquileres)",
          precio: config.precioModelo115,
          total: config.precioModelo115
        });
      }
      if (budget.modelo130) {
        servicios.push({
          concepto: "Modelo 130 (IRPF aut\xF3nomos)",
          precio: config.precioModelo130,
          total: config.precioModelo130
        });
      }
      if (budget.modelo100) {
        servicios.push({
          concepto: "Modelo 100 (Renta)",
          precio: config.precioModelo100,
          total: config.precioModelo100
        });
      }
      if (budget.modelo349) {
        servicios.push({
          concepto: "Modelo 349 (Operaciones intracomunitarias)",
          precio: config.precioModelo349,
          total: config.precioModelo349
        });
      }
      if (budget.modelo347) {
        servicios.push({
          concepto: "Modelo 347 (Operaciones con terceros)",
          precio: config.precioModelo347,
          total: config.precioModelo347
        });
      }
      if (budget.solicitudCertificados) {
        servicios.push({
          concepto: "Solicitud de certificados",
          precio: config.precioCertificados,
          total: config.precioCertificados
        });
      }
      if (budget.censosAEAT) {
        servicios.push({
          concepto: "Gesti\xF3n censos AEAT",
          precio: config.precioCensos,
          total: config.precioCensos
        });
      }
      if (budget.recepcionNotificaciones) {
        servicios.push({
          concepto: "Recepci\xF3n notificaciones",
          precio: config.precioNotificaciones,
          total: config.precioNotificaciones
        });
      }
      if (budget.estadisticasINE) {
        servicios.push({
          concepto: "Estad\xEDsticas INE",
          precio: config.precioEstadisticas,
          total: config.precioEstadisticas
        });
      }
      if (budget.solicitudAyudas) {
        servicios.push({
          concepto: "Solicitud ayudas y subvenciones",
          precio: config.precioAyudas,
          total: config.precioAyudas
        });
      }
    }
    if (tipo === "laboral" && budget.conLaboralSocial && budget.nominasMes > 0) {
      servicios.push({
        concepto: "Gesti\xF3n de n\xF3minas",
        cantidad: budget.nominasMes,
        precio: config.precioBasePorNomina,
        total: budget.nominasMes * config.precioBasePorNomina
      });
    }
    return servicios;
  }
  /**
   * Construir HTML del email
   */
  buildEmailHTML(budget, config, customMessage) {
    const companyName = budget.tipoGestoria === "ASESORIA_LA_LLAVE" ? config.nombreEmpresa : config.nombreEmpresa;
    const primaryColor = config.colorPrimario || "#2563eb";
    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Presupuesto ${budget.numero}</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          
          <!-- Cabecera -->
          <tr>
            <td style="background: linear-gradient(135deg, ${primaryColor} 0%, ${config.colorSecundario || "#1e40af"} 100%); padding: 40px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 32px; font-weight: bold;">${companyName}</h1>
              <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Tu gestor\xEDa de confianza</p>
            </td>
          </tr>
          
          <!-- Contenido -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px 0; color: ${primaryColor}; font-size: 24px;">\xA1Hola ${budget.nombreCliente}!</h2>
              
              <p style="margin: 0 0 15px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                ${customMessage || "Gracias por tu inter\xE9s en nuestros servicios. Te adjuntamos el presupuesto solicitado con todos los detalles de los servicios que podemos ofrecerte."}
              </p>
              
              <div style="background-color: #eff6ff; border-left: 4px solid ${primaryColor}; padding: 20px; margin: 25px 0; border-radius: 4px;">
                <p style="margin: 0 0 10px 0; color: #1e40af; font-weight: bold; font-size: 14px;">\u{1F4C4} PRESUPUESTO ${budget.numero}</p>
                <p style="margin: 0 0 5px 0; color: #374151; font-size: 14px;"><strong>Fecha:</strong> ${this.formatDate(budget.fechaCreacion)}</p>
                <p style="margin: 0 0 5px 0; color: #374151; font-size: 14px;"><strong>V\xE1lido hasta:</strong> ${this.formatDate(new Date(budget.fechaCreacion.getTime() + 30 * 24 * 60 * 60 * 1e3))}</p>
                <p style="margin: 0; color: #374151; font-size: 18px; font-weight: bold; margin-top: 10px;"><strong>Importe Total:</strong> ${this.formatCurrency(Number(budget.totalFinal))}</p>
              </div>
              
              <p style="margin: 25px 0 15px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                En el documento PDF adjunto encontrar\xE1s el desglose completo de todos los servicios incluidos en este presupuesto.
              </p>
              
              <p style="margin: 0 0 15px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Si tienes cualquier duda o necesitas m\xE1s informaci\xF3n, no dudes en contactar con nosotros. Estaremos encantados de atenderte.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 14px;">\xBFEst\xE1s listo para empezar?</p>
                <a href="${config.webEmpresa || "#"}" style="display: inline-block; background-color: ${primaryColor}; color: white; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: bold; font-size: 16px; margin-top: 10px;">Aceptar Presupuesto</a>
              </div>
            </td>
          </tr>
          
          <!-- Pie de p\xE1gina -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px 0; color: #374151; font-size: 14px; text-align: center;">
                <strong>${companyName}</strong>
              </p>
              <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 13px; text-align: center;">
                ${config.direccionEmpresa || ""}
              </p>
              <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 13px; text-align: center;">
                \u{1F4E7} ${config.emailEmpresa || ""} \u2022 \u{1F4DE} ${config.telefonoEmpresa || ""}
              </p>
              ${config.webEmpresa ? `
              <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 13px; text-align: center;">
                \u{1F310} <a href="${config.webEmpresa}" style="color: ${primaryColor}; text-decoration: none;">${config.webEmpresa}</a>
              </p>
              ` : ""}
            </td>
          </tr>
          
        </table>
        
        <!-- Nota legal -->
        <p style="margin: 20px 0 0 0; color: #9ca3af; font-size: 12px; text-align: center; max-width: 600px;">
          Este email y cualquier archivo adjunto son confidenciales y est\xE1n destinados exclusivamente al destinatario. Si ha recibido este email por error, por favor notif\xEDquelo inmediatamente y elim\xEDnelo.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }
  /**
   * Registrar envío de email en base de datos
   */
  async logEmailSend(budgetId, to, cc) {
    await prisma10.budget_email_logs.create({
      data: {
        budgetId,
        emailDestino: to,
        emailCopia: cc ? cc.join(", ") : null,
        fechaEnvio: /* @__PURE__ */ new Date()
      }
    });
  }
  // ===== UTILIDADES =====
  formatDate(date) {
    return new Date(date).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  }
  formatCurrency(amount) {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR"
    }).format(amount);
  }
};
var gestoriaBudgetEmailService = new GestoriaBudgetEmailService();

// server/services/gestoria-budget-conversion-service.ts
import { PrismaClient as PrismaClient11 } from "@prisma/client";
var prisma11 = new PrismaClient11();
var GestoriaBudgetConversionService = class {
  /**
   * Convertir un presupuesto aceptado a cliente
   */
  async convertToClient(budgetId, options = {}) {
    try {
      const budget = await prisma11.gestoria_budgets.findUnique({
        where: { id: budgetId },
        include: {
          serviciosAdicionales: true
        }
      });
      if (!budget) {
        throw new Error(`Presupuesto con ID ${budgetId} no encontrado`);
      }
      if (budget.estado !== "ACEPTADO") {
        throw new Error("Solo se pueden convertir presupuestos en estado ACEPTADO");
      }
      if (budget.clienteId) {
        throw new Error("Este presupuesto ya ha sido convertido a cliente");
      }
      if (!budget.nifCif) {
        throw new Error("El presupuesto debe tener CIF/NIF para convertirlo a cliente");
      }
      const existingClient = await prisma11.clients.findFirst({
        where: {
          nifCif: budget.nifCif
        }
      });
      if (existingClient) {
        throw new Error(`Ya existe un cliente con CIF/NIF ${budget.nifCif}`);
      }
      const client = await prisma11.clients.create({
        data: {
          id: `CLI-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          razonSocial: budget.nombreCliente,
          nifCif: budget.nifCif,
          tipo: "AUTONOMO",
          // Por defecto, se puede ajustar según necesidad
          email: budget.email || null,
          telefono: budget.telefono || null,
          direccion: budget.direccion || null,
          tipoGestoria: budget.tipoGestoria,
          presupuestoOrigenId: budgetId,
          isActive: true,
          fechaAlta: /* @__PURE__ */ new Date()
        }
      });
      await this.createTaxAssignments(client.id, budget);
      await this.archiveBudgetPDF(budget, client.id);
      await prisma11.gestoria_budgets.update({
        where: { id: budgetId },
        data: {
          clienteId: client.id
        }
      });
      await prisma11.gestoria_budget_statistics_events.create({
        data: {
          budgetId,
          evento: "CONVERTIDO",
          fecha: /* @__PURE__ */ new Date()
        }
      });
      return client.id;
    } catch (error) {
      console.error("Error converting budget to client:", error);
      throw error;
    }
  }
  /**
   * Crear asignaciones de modelos fiscales
   */
  async createTaxAssignments(clientId, budget) {
    const assignments = [];
    let periodicidad = "TRIMESTRAL";
    if (budget.periodoDeclaraciones === "Mensual") {
      periodicidad = "MENSUAL";
    } else if (budget.periodoDeclaraciones === "Anual") {
      periodicidad = "ANUAL";
    }
    if (budget.modelo303) {
      assignments.push({
        id: `${clientId}-303-${Date.now()}`,
        clientId,
        taxModelCode: "303",
        periodicidad,
        activo: true,
        fechaAsignacion: /* @__PURE__ */ new Date()
      });
    }
    if (budget.modelo111) {
      assignments.push({
        id: `${clientId}-111-${Date.now() + 1}`,
        clientId,
        taxModelCode: "111",
        periodicidad,
        activo: true,
        fechaAsignacion: /* @__PURE__ */ new Date()
      });
    }
    if (budget.modelo115) {
      assignments.push({
        id: `${clientId}-115-${Date.now() + 2}`,
        clientId,
        taxModelCode: "115",
        periodicidad,
        activo: true,
        fechaAsignacion: /* @__PURE__ */ new Date()
      });
    }
    if (budget.modelo130) {
      assignments.push({
        id: `${clientId}-130-${Date.now() + 3}`,
        clientId,
        taxModelCode: "130",
        periodicidad: "TRIMESTRAL",
        activo: true,
        fechaAsignacion: /* @__PURE__ */ new Date()
      });
    }
    if (budget.modelo100) {
      assignments.push({
        id: `${clientId}-100-${Date.now() + 4}`,
        clientId,
        taxModelCode: "100",
        periodicidad: "ANUAL",
        activo: true,
        fechaAsignacion: /* @__PURE__ */ new Date()
      });
    }
    if (budget.modelo349) {
      assignments.push({
        id: `${clientId}-349-${Date.now() + 5}`,
        clientId,
        taxModelCode: "349",
        periodicidad: "MENSUAL",
        activo: true,
        fechaAsignacion: /* @__PURE__ */ new Date()
      });
    }
    if (budget.modelo347) {
      assignments.push({
        id: `${clientId}-347-${Date.now() + 6}`,
        clientId,
        taxModelCode: "347",
        periodicidad: "ANUAL",
        activo: true,
        fechaAsignacion: /* @__PURE__ */ new Date()
      });
    }
    if (assignments.length > 0) {
      await prisma11.client_tax_assignments.createMany({
        data: assignments
      });
    }
  }
  /**
   * Archivar PDF del presupuesto como documento del cliente
   */
  async archiveBudgetPDF(budget, clientId) {
    try {
      await prisma11.documents.create({
        data: {
          id: `DOC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          client_id: clientId,
          created_by: "system",
          name: `Presupuesto ${budget.numero}`,
          type: "PRESUPUESTO",
          file_path: budget.pdfPath || null,
          status: "active"
        }
      });
    } catch (error) {
      console.error("Error archiving budget PDF:", error);
    }
  }
  /**
   * Verificar si un presupuesto puede ser convertido a cliente
   */
  async canConvertToClient(budgetId) {
    const budget = await prisma11.gestoria_budgets.findUnique({
      where: { id: budgetId }
    });
    if (!budget) {
      return { canConvert: false, reason: "Presupuesto no encontrado" };
    }
    if (budget.estado !== "ACEPTADO") {
      return { canConvert: false, reason: "Solo se pueden convertir presupuestos aceptados" };
    }
    if (budget.clienteId) {
      return { canConvert: false, reason: "Este presupuesto ya fue convertido" };
    }
    if (!budget.nifCif) {
      return { canConvert: false, reason: "El presupuesto debe tener CIF/NIF" };
    }
    const existingClient = await prisma11.clients.findFirst({
      where: {
        nifCif: budget.nifCif
      }
    });
    if (existingClient) {
      return { canConvert: false, reason: `Ya existe un cliente con CIF/NIF ${budget.nifCif}` };
    }
    return { canConvert: true };
  }
};
var gestoriaBudgetConversionService = new GestoriaBudgetConversionService();

// server/routes/gestoria-budgets.ts
init_prisma_client();
var router5 = express5.Router();
router5.get("/", async (req, res) => {
  try {
    const filters = {
      tipoGestoria: req.query.tipo,
      estado: req.query.estado,
      nombreCliente: req.query.nombreCompleto,
      nifCif: req.query.cifNif,
      email: req.query.email,
      fechaDesde: req.query.fechaDesde ? new Date(req.query.fechaDesde) : void 0,
      fechaHasta: req.query.fechaHasta ? new Date(req.query.fechaHasta) : void 0
    };
    const budgets = await gestoriaBudgetService.listBudgets(filters);
    res.json({
      success: true,
      data: budgets
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});
router5.get("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const budget = await gestoriaBudgetService.getBudgetById(id);
    res.json({
      success: true,
      data: budget
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message
    });
  }
});
router5.post("/", async (req, res) => {
  try {
    const input = req.body;
    const budget = await gestoriaBudgetService.createBudget(input);
    res.status(201).json({
      success: true,
      data: budget,
      message: "Presupuesto creado exitosamente"
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});
router5.put("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const input = req.body;
    const budget = await gestoriaBudgetService.updateBudget(id, input);
    res.json({
      success: true,
      data: budget,
      message: "Presupuesto actualizado exitosamente"
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});
router5.delete("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    await gestoriaBudgetService.deleteBudget(id);
    res.json({
      success: true,
      message: "Presupuesto eliminado exitosamente"
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});
router5.post("/calculate", async (req, res) => {
  try {
    const input = req.body.calculation;
    const tipo = req.body.tipo;
    const result = await gestoriaBudgetCalculationService.calculate(input, tipo);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});
router5.post("/:id/recalculate", async (req, res) => {
  try {
    const id = req.params.id;
    const budget = await gestoriaBudgetService.getBudgetById(id);
    const calculationInput = {
      facturasMes: budget.facturasMes,
      nominasMes: budget.nominasMes || void 0,
      facturacion: Number(budget.facturacion),
      sistemaTributacion: budget.sistemaTributacion,
      periodoDeclaraciones: budget.periodoDeclaraciones,
      modelo303: budget.modelo303,
      modelo111: budget.modelo111,
      modelo115: budget.modelo115,
      modelo130: budget.modelo130,
      modelo100: budget.modelo100,
      modelo349: budget.modelo349,
      modelo347: budget.modelo347,
      solicitudCertificados: budget.solicitudCertificados,
      censosAEAT: budget.censosAEAT,
      recepcionNotificaciones: budget.recepcionNotificaciones,
      estadisticasINE: budget.estadisticasINE,
      solicitudAyudas: budget.solicitudAyudas,
      conLaboralSocial: budget.conLaboralSocial,
      aplicaDescuento: budget.aplicaDescuento,
      tipoDescuento: budget.tipoDescuento,
      valorDescuento: budget.valorDescuento ? Number(budget.valorDescuento) : void 0,
      serviciosAdicionales: budget.serviciosAdicionales?.map((s) => ({
        nombre: s.nombre,
        precio: Number(s.precio),
        tipoServicio: s.tipoServicio,
        incluido: s.incluido
      }))
    };
    const result = await gestoriaBudgetCalculationService.calculate(calculationInput, budget.tipoGestoria);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});
router5.post("/:id/send", async (req, res) => {
  try {
    const id = req.params.id;
    const options = req.body;
    await gestoriaBudgetEmailService.sendBudgetEmail(id, options);
    res.json({
      success: true,
      message: "Presupuesto enviado exitosamente"
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});
router5.post("/:id/accept", async (req, res) => {
  try {
    const id = req.params.id;
    const budget = await gestoriaBudgetService.acceptBudget(id);
    let clientId = budget.clienteId;
    if (!clientId) {
      try {
        const canConvert = await gestoriaBudgetConversionService.canConvertToClient(id);
        if (canConvert.canConvert) {
          clientId = await gestoriaBudgetConversionService.convertToClient(id, {
            notifyClient: false
            // No enviar notificación adicional
          });
        }
      } catch (conversionError) {
        console.warn(`No se pudo convertir autom\xE1ticamente presupuesto ${id} a cliente:`, conversionError);
      }
    }
    res.json({
      success: true,
      data: { ...budget, clientId },
      message: clientId ? "Presupuesto aceptado y cliente creado exitosamente" : "Presupuesto aceptado exitosamente"
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});
router5.post("/:id/reject", async (req, res) => {
  try {
    const id = req.params.id;
    const motivoRechazo = req.body.motivoRechazo;
    const budget = await gestoriaBudgetService.rejectBudget(id, motivoRechazo);
    res.json({
      success: true,
      data: budget,
      message: "Presupuesto rechazado"
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});
router5.post("/:id/convert", async (req, res) => {
  try {
    const id = req.params.id;
    const options = req.body;
    const clientId = await gestoriaBudgetConversionService.convertToClient(id, options);
    res.json({
      success: true,
      data: { clientId },
      message: "Presupuesto convertido a cliente exitosamente"
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});
router5.get("/:id/can-convert", async (req, res) => {
  try {
    const id = req.params.id;
    const result = await gestoriaBudgetConversionService.canConvertToClient(id);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});
router5.get("/:id/pdf", async (req, res) => {
  try {
    const id = req.params.id;
    const budget = await gestoriaBudgetService.getBudgetById(id);
    const pdfData = {
      numero: budget.numero,
      fecha: budget.fechaCreacion,
      fechaValidez: new Date(budget.fechaCreacion.getTime() + 30 * 24 * 60 * 60 * 1e3),
      // 30 días después
      tipo: budget.tipoGestoria,
      nombreCompleto: budget.nombreCliente,
      cifNif: budget.nifCif || void 0,
      email: budget.email || void 0,
      telefono: budget.telefono || void 0,
      direccion: budget.direccion || void 0,
      codigoPostal: void 0,
      // No existe en schema
      ciudad: void 0,
      // No existe en schema
      provincia: void 0,
      // No existe en schema
      actividadEmpresarial: void 0,
      // No existe en schema
      facturacion: Number(budget.facturacion),
      facturasMes: budget.facturasMes,
      nominasMes: budget.nominasMes || void 0,
      sistemaTributacion: budget.sistemaTributacion,
      periodoDeclaraciones: budget.periodoDeclaraciones,
      serviciosContabilidad: [],
      // Se construyen en el servicio
      serviciosLaborales: [],
      serviciosAdicionales: budget.serviciosAdicionales.map((s) => ({
        nombre: s.nombre,
        precio: Number(s.precio),
        tipoServicio: s.tipoServicio
      })),
      totalContabilidad: Number(budget.totalContabilidad),
      totalLaboral: Number(budget.totalLaboral),
      subtotal: Number(budget.totalContabilidad) + Number(budget.totalLaboral),
      descuentoCalculado: Number(budget.descuentoCalculado),
      totalFinal: Number(budget.totalFinal),
      aplicaDescuento: budget.aplicaDescuento,
      tipoDescuento: budget.tipoDescuento || void 0,
      valorDescuento: budget.valorDescuento ? Number(budget.valorDescuento) : void 0,
      motivoDescuento: budget.tipoDescuento || void 0,
      // Usar tipoDescuento como motivo
      observaciones: void 0
      // No existe en schema
    };
    const pdfBuffer = await gestoriaBudgetPDFService.generatePDF(pdfData);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="Presupuesto_${budget.numero}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});
router5.get("/stats/summary", async (req, res) => {
  try {
    const tipo = req.query.tipo;
    const fechaDesde = req.query.fechaDesde ? new Date(req.query.fechaDesde) : void 0;
    const fechaHasta = req.query.fechaHasta ? new Date(req.query.fechaHasta) : void 0;
    const stats = await gestoriaBudgetService.getStatistics(tipo, fechaDesde, fechaHasta);
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});
router5.get("/stats/by-month", async (req, res) => {
  try {
    const tipo = req.query.tipo;
    const year = req.query.year ? parseInt(req.query.year) : (/* @__PURE__ */ new Date()).getFullYear();
    const months = [];
    for (let month = 1; month <= 12; month++) {
      const fechaDesde = new Date(year, month - 1, 1);
      const fechaHasta = new Date(year, month, 0, 23, 59, 59);
      const stats = await gestoriaBudgetService.getStatistics(tipo, fechaDesde, fechaHasta);
      months.push({
        month,
        year,
        ...stats
      });
    }
    res.json({
      success: true,
      data: months
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});
router5.get("/config/list", async (req, res) => {
  try {
    const filters = {
      tipo: req.query.tipo,
      activo: req.query.activo ? req.query.activo === "true" : void 0
    };
    const configs = await gestoriaBudgetConfigService.getAllConfigs(filters);
    res.json({
      success: true,
      data: configs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});
router5.get("/config/active/:tipo", async (req, res) => {
  try {
    const tipo = req.params.tipo;
    const config = await gestoriaBudgetConfigService.getActiveConfig(tipo);
    if (!config) {
      return res.status(404).json({
        success: false,
        message: `No hay configuraci\xF3n activa para ${tipo}`
      });
    }
    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});
router5.post("/config", async (req, res) => {
  try {
    const input = req.body;
    const config = await gestoriaBudgetConfigService.createConfig(input);
    res.status(201).json({
      success: true,
      data: config,
      message: "Configuraci\xF3n creada exitosamente"
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});
router5.put("/config/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const input = req.body;
    const config = await gestoriaBudgetConfigService.updateConfig(id, input);
    res.json({
      success: true,
      data: config,
      message: "Configuraci\xF3n actualizada exitosamente"
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});
router5.delete("/config/:id", async (req, res) => {
  try {
    const id = req.params.id;
    await gestoriaBudgetConfigService.deleteConfig(id);
    res.json({
      success: true,
      message: "Configuraci\xF3n eliminada exitosamente"
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});
router5.get("/config/autonomo", async (req, res) => {
  try {
    const { getConfiguracionActual: getConfiguracionActual2 } = await Promise.resolve().then(() => (init_calculateAutonomo(), calculateAutonomo_exports));
    const config = await getConfiguracionActual2();
    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});
router5.put("/config/autonomo", async (req, res) => {
  try {
    const { porcentajePeriodoMensual, porcentajeEDN, porcentajeModulos, minimoMensual } = req.body;
    const config = await prisma_client_default.gestoria_budget_autonomo_config.findFirst({
      where: { activo: true }
    });
    if (!config) {
      return res.status(404).json({
        success: false,
        message: "No se encontr\xF3 configuraci\xF3n activa"
      });
    }
    const updated = await prisma_client_default.gestoria_budget_autonomo_config.update({
      where: { id: config.id },
      data: {
        porcentajePeriodoMensual: porcentajePeriodoMensual !== void 0 ? porcentajePeriodoMensual : void 0,
        porcentajeEDN: porcentajeEDN !== void 0 ? porcentajeEDN : void 0,
        porcentajeModulos: porcentajeModulos !== void 0 ? porcentajeModulos : void 0,
        minimoMensual: minimoMensual !== void 0 ? minimoMensual : void 0,
        modificadoPor: req.body.userId || "system"
      }
    });
    const { clearConfigCache: clearConfigCache2 } = await Promise.resolve().then(() => (init_calculateAutonomo(), calculateAutonomo_exports));
    clearConfigCache2();
    res.json({
      success: true,
      data: updated,
      message: "Configuraci\xF3n actualizada exitosamente"
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});
router5.get("/config/autonomo/invoice-tiers", async (req, res) => {
  try {
    const config = await prisma_client_default.gestoria_budget_autonomo_config.findFirst({
      where: { activo: true },
      include: {
        tramosFacturas: {
          orderBy: { orden: "asc" }
        }
      }
    });
    if (!config) {
      return res.status(404).json({
        success: false,
        message: "No se encontr\xF3 configuraci\xF3n activa"
      });
    }
    res.json({
      success: true,
      data: config.tramosFacturas
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});
router5.post("/config/autonomo/invoice-tiers", async (req, res) => {
  try {
    const { orden, minFacturas, maxFacturas, precio, etiqueta } = req.body;
    const config = await prisma_client_default.gestoria_budget_autonomo_config.findFirst({
      where: { activo: true }
    });
    if (!config) {
      return res.status(404).json({
        success: false,
        message: "No se encontr\xF3 configuraci\xF3n activa"
      });
    }
    const tramo = await prisma_client_default.gestoria_budget_invoice_tiers.create({
      data: {
        configId: config.id,
        orden,
        minFacturas,
        maxFacturas: maxFacturas || null,
        precio,
        etiqueta: etiqueta || null
      }
    });
    const { clearConfigCache: clearConfigCache2 } = await Promise.resolve().then(() => (init_calculateAutonomo(), calculateAutonomo_exports));
    clearConfigCache2();
    res.status(201).json({
      success: true,
      data: tramo,
      message: "Tramo de facturas creado exitosamente"
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});
router5.put("/config/autonomo/invoice-tiers/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const { orden, minFacturas, maxFacturas, precio, etiqueta } = req.body;
    const tramo = await prisma_client_default.gestoria_budget_invoice_tiers.update({
      where: { id },
      data: {
        orden: orden !== void 0 ? orden : void 0,
        minFacturas: minFacturas !== void 0 ? minFacturas : void 0,
        maxFacturas: maxFacturas !== void 0 ? maxFacturas || null : void 0,
        precio: precio !== void 0 ? precio : void 0,
        etiqueta: etiqueta !== void 0 ? etiqueta || null : void 0
      }
    });
    const { clearConfigCache: clearConfigCache2 } = await Promise.resolve().then(() => (init_calculateAutonomo(), calculateAutonomo_exports));
    clearConfigCache2();
    res.json({
      success: true,
      data: tramo,
      message: "Tramo de facturas actualizado exitosamente"
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});
router5.delete("/config/autonomo/invoice-tiers/:id", async (req, res) => {
  try {
    const id = req.params.id;
    await prisma_client_default.gestoria_budget_invoice_tiers.delete({
      where: { id }
    });
    const { clearConfigCache: clearConfigCache2 } = await Promise.resolve().then(() => (init_calculateAutonomo(), calculateAutonomo_exports));
    clearConfigCache2();
    res.json({
      success: true,
      message: "Tramo de facturas eliminado exitosamente"
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});
router5.put("/config/autonomo/invoice-tiers/reorder", async (req, res) => {
  try {
    const { orders } = req.body;
    await Promise.all(
      orders.map(
        (item) => prisma_client_default.gestoria_budget_invoice_tiers.update({
          where: { id: item.id },
          data: { orden: item.orden }
        })
      )
    );
    const { clearConfigCache: clearConfigCache2 } = await Promise.resolve().then(() => (init_calculateAutonomo(), calculateAutonomo_exports));
    clearConfigCache2();
    res.json({
      success: true,
      message: "Tramos reordenados exitosamente"
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});
router5.get("/config/autonomo/payroll-tiers", async (req, res) => {
  try {
    const config = await prisma_client_default.gestoria_budget_autonomo_config.findFirst({
      where: { activo: true },
      include: {
        tramosNominas: {
          orderBy: { orden: "asc" }
        }
      }
    });
    if (!config) {
      return res.status(404).json({
        success: false,
        message: "No se encontr\xF3 configuraci\xF3n activa"
      });
    }
    res.json({
      success: true,
      data: config.tramosNominas
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});
router5.post("/config/autonomo/payroll-tiers", async (req, res) => {
  try {
    const { orden, minNominas, maxNominas, precio, etiqueta } = req.body;
    const config = await prisma_client_default.gestoria_budget_autonomo_config.findFirst({
      where: { activo: true }
    });
    if (!config) {
      return res.status(404).json({
        success: false,
        message: "No se encontr\xF3 configuraci\xF3n activa"
      });
    }
    const tramo = await prisma_client_default.gestoria_budget_payroll_tiers.create({
      data: {
        configId: config.id,
        orden,
        minNominas,
        maxNominas: maxNominas || null,
        precio,
        etiqueta: etiqueta || null
      }
    });
    const { clearConfigCache: clearConfigCache2 } = await Promise.resolve().then(() => (init_calculateAutonomo(), calculateAutonomo_exports));
    clearConfigCache2();
    res.status(201).json({
      success: true,
      data: tramo,
      message: "Tramo de n\xF3minas creado exitosamente"
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});
router5.put("/config/autonomo/payroll-tiers/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const { orden, minNominas, maxNominas, precio, etiqueta } = req.body;
    const tramo = await prisma_client_default.gestoria_budget_payroll_tiers.update({
      where: { id },
      data: {
        orden: orden !== void 0 ? orden : void 0,
        minNominas: minNominas !== void 0 ? minNominas : void 0,
        maxNominas: maxNominas !== void 0 ? maxNominas || null : void 0,
        precio: precio !== void 0 ? precio : void 0,
        etiqueta: etiqueta !== void 0 ? etiqueta || null : void 0
      }
    });
    const { clearConfigCache: clearConfigCache2 } = await Promise.resolve().then(() => (init_calculateAutonomo(), calculateAutonomo_exports));
    clearConfigCache2();
    res.json({
      success: true,
      data: tramo,
      message: "Tramo de n\xF3minas actualizado exitosamente"
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});
router5.delete("/config/autonomo/payroll-tiers/:id", async (req, res) => {
  try {
    const id = req.params.id;
    await prisma_client_default.gestoria_budget_payroll_tiers.delete({
      where: { id }
    });
    const { clearConfigCache: clearConfigCache2 } = await Promise.resolve().then(() => (init_calculateAutonomo(), calculateAutonomo_exports));
    clearConfigCache2();
    res.json({
      success: true,
      message: "Tramo de n\xF3minas eliminado exitosamente"
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});
router5.get("/config/autonomo/billing-tiers", async (req, res) => {
  try {
    const config = await prisma_client_default.gestoria_budget_autonomo_config.findFirst({
      where: { activo: true },
      include: {
        tramosFacturacionAnual: {
          orderBy: { orden: "asc" }
        }
      }
    });
    if (!config) {
      return res.status(404).json({
        success: false,
        message: "No se encontr\xF3 configuraci\xF3n activa"
      });
    }
    res.json({
      success: true,
      data: config.tramosFacturacionAnual
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});
router5.post("/config/autonomo/billing-tiers", async (req, res) => {
  try {
    const { orden, minFacturacion, maxFacturacion, multiplicador, etiqueta } = req.body;
    const config = await prisma_client_default.gestoria_budget_autonomo_config.findFirst({
      where: { activo: true }
    });
    if (!config) {
      return res.status(404).json({
        success: false,
        message: "No se encontr\xF3 configuraci\xF3n activa"
      });
    }
    const tramo = await prisma_client_default.gestoria_budget_annual_billing_tiers.create({
      data: {
        configId: config.id,
        orden,
        minFacturacion,
        maxFacturacion: maxFacturacion || null,
        multiplicador,
        etiqueta: etiqueta || null
      }
    });
    const { clearConfigCache: clearConfigCache2 } = await Promise.resolve().then(() => (init_calculateAutonomo(), calculateAutonomo_exports));
    clearConfigCache2();
    res.status(201).json({
      success: true,
      data: tramo,
      message: "Tramo de facturaci\xF3n creado exitosamente"
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});
router5.put("/config/autonomo/billing-tiers/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const { orden, minFacturacion, maxFacturacion, multiplicador, etiqueta } = req.body;
    const tramo = await prisma_client_default.gestoria_budget_annual_billing_tiers.update({
      where: { id },
      data: {
        orden: orden !== void 0 ? orden : void 0,
        minFacturacion: minFacturacion !== void 0 ? minFacturacion : void 0,
        maxFacturacion: maxFacturacion !== void 0 ? maxFacturacion || null : void 0,
        multiplicador: multiplicador !== void 0 ? multiplicador : void 0,
        etiqueta: etiqueta !== void 0 ? etiqueta || null : void 0
      }
    });
    const { clearConfigCache: clearConfigCache2 } = await Promise.resolve().then(() => (init_calculateAutonomo(), calculateAutonomo_exports));
    clearConfigCache2();
    res.json({
      success: true,
      data: tramo,
      message: "Tramo de facturaci\xF3n actualizado exitosamente"
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});
router5.delete("/config/autonomo/billing-tiers/:id", async (req, res) => {
  try {
    const id = req.params.id;
    await prisma_client_default.gestoria_budget_annual_billing_tiers.delete({
      where: { id }
    });
    const { clearConfigCache: clearConfigCache2 } = await Promise.resolve().then(() => (init_calculateAutonomo(), calculateAutonomo_exports));
    clearConfigCache2();
    res.json({
      success: true,
      message: "Tramo de facturaci\xF3n eliminado exitosamente"
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});
router5.get("/config/autonomo/fiscal-models", async (req, res) => {
  try {
    const config = await prisma_client_default.gestoria_budget_autonomo_config.findFirst({
      where: { activo: true },
      include: {
        preciosModelosFiscales: {
          orderBy: { orden: "asc" }
        }
      }
    });
    if (!config) {
      return res.status(404).json({
        success: false,
        message: "No se encontr\xF3 configuraci\xF3n activa"
      });
    }
    res.json({
      success: true,
      data: config.preciosModelosFiscales
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});
router5.post("/config/autonomo/fiscal-models", async (req, res) => {
  try {
    const { codigoModelo, nombreModelo, precio, activo, orden } = req.body;
    const config = await prisma_client_default.gestoria_budget_autonomo_config.findFirst({
      where: { activo: true }
    });
    if (!config) {
      return res.status(404).json({
        success: false,
        message: "No se encontr\xF3 configuraci\xF3n activa"
      });
    }
    const modelo = await prisma_client_default.gestoria_budget_fiscal_model_pricing.create({
      data: {
        configId: config.id,
        codigoModelo,
        nombreModelo,
        precio,
        activo: activo !== void 0 ? activo : true,
        orden: orden !== void 0 ? orden : 0
      }
    });
    const { clearConfigCache: clearConfigCache2 } = await Promise.resolve().then(() => (init_calculateAutonomo(), calculateAutonomo_exports));
    clearConfigCache2();
    res.status(201).json({
      success: true,
      data: modelo,
      message: "Modelo fiscal creado exitosamente"
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});
router5.put("/config/autonomo/fiscal-models/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const { codigoModelo, nombreModelo, precio, activo, orden } = req.body;
    const modelo = await prisma_client_default.gestoria_budget_fiscal_model_pricing.update({
      where: { id },
      data: {
        codigoModelo: codigoModelo !== void 0 ? codigoModelo : void 0,
        nombreModelo: nombreModelo !== void 0 ? nombreModelo : void 0,
        precio: precio !== void 0 ? precio : void 0,
        activo: activo !== void 0 ? activo : void 0,
        orden: orden !== void 0 ? orden : void 0
      }
    });
    const { clearConfigCache: clearConfigCache2 } = await Promise.resolve().then(() => (init_calculateAutonomo(), calculateAutonomo_exports));
    clearConfigCache2();
    res.json({
      success: true,
      data: modelo,
      message: "Modelo fiscal actualizado exitosamente"
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});
router5.delete("/config/autonomo/fiscal-models/:id", async (req, res) => {
  try {
    const id = req.params.id;
    await prisma_client_default.gestoria_budget_fiscal_model_pricing.delete({
      where: { id }
    });
    const { clearConfigCache: clearConfigCache2 } = await Promise.resolve().then(() => (init_calculateAutonomo(), calculateAutonomo_exports));
    clearConfigCache2();
    res.json({
      success: true,
      message: "Modelo fiscal eliminado exitosamente"
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});
router5.get("/config/autonomo/services", async (req, res) => {
  try {
    const config = await prisma_client_default.gestoria_budget_autonomo_config.findFirst({
      where: { activo: true },
      include: {
        preciosServiciosAdicionales: {
          orderBy: { orden: "asc" }
        }
      }
    });
    if (!config) {
      return res.status(404).json({
        success: false,
        message: "No se encontr\xF3 configuraci\xF3n activa"
      });
    }
    res.json({
      success: true,
      data: config.preciosServiciosAdicionales
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});
router5.post("/config/autonomo/services", async (req, res) => {
  try {
    const { codigo, nombre, descripcion, precio, tipoServicio, activo, orden } = req.body;
    const config = await prisma_client_default.gestoria_budget_autonomo_config.findFirst({
      where: { activo: true }
    });
    if (!config) {
      return res.status(404).json({
        success: false,
        message: "No se encontr\xF3 configuraci\xF3n activa"
      });
    }
    const servicio = await prisma_client_default.gestoria_budget_additional_service_pricing.create({
      data: {
        configId: config.id,
        codigo,
        nombre,
        descripcion: descripcion || null,
        precio,
        tipoServicio,
        activo: activo !== void 0 ? activo : true,
        orden: orden !== void 0 ? orden : 0
      }
    });
    const { clearConfigCache: clearConfigCache2 } = await Promise.resolve().then(() => (init_calculateAutonomo(), calculateAutonomo_exports));
    clearConfigCache2();
    res.status(201).json({
      success: true,
      data: servicio,
      message: "Servicio adicional creado exitosamente"
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});
router5.put("/config/autonomo/services/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const { codigo, nombre, descripcion, precio, tipoServicio, activo, orden } = req.body;
    const servicio = await prisma_client_default.gestoria_budget_additional_service_pricing.update({
      where: { id },
      data: {
        codigo: codigo !== void 0 ? codigo : void 0,
        nombre: nombre !== void 0 ? nombre : void 0,
        descripcion: descripcion !== void 0 ? descripcion || null : void 0,
        precio: precio !== void 0 ? precio : void 0,
        tipoServicio: tipoServicio !== void 0 ? tipoServicio : void 0,
        activo: activo !== void 0 ? activo : void 0,
        orden: orden !== void 0 ? orden : void 0
      }
    });
    const { clearConfigCache: clearConfigCache2 } = await Promise.resolve().then(() => (init_calculateAutonomo(), calculateAutonomo_exports));
    clearConfigCache2();
    res.json({
      success: true,
      data: servicio,
      message: "Servicio adicional actualizado exitosamente"
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});
router5.delete("/config/autonomo/services/:id", async (req, res) => {
  try {
    const id = req.params.id;
    await prisma_client_default.gestoria_budget_additional_service_pricing.delete({
      where: { id }
    });
    const { clearConfigCache: clearConfigCache2 } = await Promise.resolve().then(() => (init_calculateAutonomo(), calculateAutonomo_exports));
    clearConfigCache2();
    res.json({
      success: true,
      message: "Servicio adicional eliminado exitosamente"
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});
var gestoria_budgets_default = router5;

// server/services/clients-import.ts
init_prisma_client();
import ExcelJS2 from "exceljs";
import { randomUUID as randomUUID4 } from "crypto";
logger.info("\u2705 [DIAGNOSTICO] M\xF3dulo server/services/clients-import.ts cargado.");
async function generateClientsTemplate() {
  const workbook = new ExcelJS2.Workbook();
  const clientsSheet = workbook.addWorksheet("Clientes");
  clientsSheet.columns = [
    { header: "A) NIF/CIF*", key: "nifCif", width: 15 },
    { header: "B) Raz\xF3n Social*", key: "razonSocial", width: 30 },
    { header: "C) Tipo*", key: "tipo", width: 15 },
    { header: "D) Email", key: "email", width: 25 },
    { header: "E) Tel\xE9fono", key: "telefono", width: 15 },
    { header: "F) Direcci\xF3n completa", key: "direccion", width: 50 },
    { header: "G) CP", key: "cp", width: 10 },
    { header: "H) Ciudad", key: "ciudad", width: 20 },
    { header: "I) Pa\xEDs", key: "pais", width: 15 },
    { header: "J) Gestor", key: "gestor", width: 20 },
    { header: "K) Fecha Alta", key: "fechaAlta", width: 15 },
    { header: "L) Activo", key: "activo", width: 10 },
    { header: "M) Notas", key: "notas", width: 30 }
  ];
  clientsSheet.getRow(1).font = { bold: true };
  clientsSheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF4472C4" }
  };
  clientsSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  const instructionsSheet = workbook.addWorksheet("Instrucciones");
  instructionsSheet.columns = [
    { header: "GU\xCDA DE IMPORTACI\xD3N DE CLIENTES", key: "guide", width: 80 }
  ];
  instructionsSheet.getRow(1).font = { bold: true, size: 14 };
  instructionsSheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFFC000" }
  };
  const instructions = [
    "",
    "\u{1F4CB} INSTRUCCIONES DE IMPORTACI\xD3N DE CLIENTES:",
    "",
    "\u{1F3AF} OBJETIVO:",
    "\u2022 Esta plantilla permite importar los datos b\xE1sicos de m\xFAltiples clientes de forma masiva",
    "\u2022 Los modelos fiscales se asignan manualmente despu\xE9s, desde la ficha de cada cliente",
    "",
    "\u{1F4DD} PASOS:",
    '1. Complete la hoja "Clientes" con los datos de sus clientes (empiece en la fila 2)',
    "2. Guarde el archivo",
    '3. S\xFAbalo a trav\xE9s del bot\xF3n "Importar Clientes"',
    "4. Los campos marcados con * son OBLIGATORIOS",
    "",
    "\u{1F464} CAMPOS DE LA HOJA CLIENTES:",
    "",
    "\u2022 NIF/CIF* (Columna A):",
    "  - Campo obligatorio (cualquier formato)",
    "  - Ejemplos: 12345678Z (DNI), X1234567L (NIE), A12345678 (CIF)",
    "  - Puede corregir el formato despu\xE9s en la ficha del cliente",
    "",
    "\u2022 Raz\xF3n Social* (Columna B):",
    "  - Nombre completo del cliente o empresa",
    '  - Ejemplo: "Juan P\xE9rez Garc\xEDa" o "Empresa Demo SL"',
    "",
    "\u2022 Tipo* (Columna C):",
    "  - Debe ser exactamente uno de estos valores:",
    "    \u2192 EMPRESA (para sociedades)",
    "    \u2192 AUTONOMO (para aut\xF3nomos)",
    "    \u2192 PARTICULAR (para personas f\xEDsicas)",
    "",
    "\u2022 Email (Columna D) - Opcional:",
    "  - Cualquier formato (se puede corregir despu\xE9s)",
    "  - Ejemplo: ejemplo@dominio.com",
    "",
    "\u2022 Tel\xE9fono (Columna E) - Opcional:",
    "  - N\xFAmero de contacto del cliente",
    "",
    "\u2022 Direcci\xF3n (Columnas F, G, H, I) - Opcional:",
    "  - F: Direcci\xF3n completa (calle, n\xFAmero, piso...)",
    "  - G: C\xF3digo Postal",
    "  - H: Ciudad",
    "  - I: Pa\xEDs",
    '  - NOTA: Estos campos se combinar\xE1n en un solo campo "Direcci\xF3n"',
    "",
    "\u2022 Gestor (Columna J) - Opcional:",
    "  - Username del usuario responsable en el sistema",
    "  - Si no existe o est\xE1 vac\xEDo, quedar\xE1 sin asignar",
    "",
    "\u2022 Fecha Alta (Columna K) - Opcional:",
    "  - Formato: YYYY-MM-DD (ejemplo: 2025-01-15)",
    "  - Si est\xE1 vac\xEDo, se usa la fecha actual",
    "",
    "\u2022 Activo (Columna L) - Opcional:",
    "  - Valores: SI o NO",
    "  - Si est\xE1 vac\xEDo, se considera SI",
    "",
    "\u2022 Notas (Columna M) - Opcional:",
    "  - Observaciones sobre el cliente",
    "",
    "\u2705 EJEMPLOS DE FILAS V\xC1LIDAS:",
    "",
    "  Fila 2: A12345678 | Empresa Demo SL | EMPRESA | info@demo.com | 912345678 | ...",
    "  Fila 3: 12345678Z | Juan P\xE9rez | AUTONOMO | juan@email.com | 600111222 | ...",
    "  Fila 4: X1234567L | Mar\xEDa Garc\xEDa | PARTICULAR | maria@gmail.com | | ...",
    "",
    "\u26A0\uFE0F IMPORTANTE:",
    "\u2022 Si un cliente con el mismo NIF/CIF ya existe, SE ACTUALIZAR\xC1 con los nuevos datos",
    "\u2022 Si el gestor no existe en el sistema, se dejar\xE1 sin asignar",
    "\u2022 Todos los datos se validan ANTES de importar",
    "\u2022 Si hay errores, se mostrar\xE1n indicando fila y campo problem\xE1tico",
    "\u2022 NO suba este archivo sin agregar sus datos reales"
  ];
  instructions.forEach((text, index) => {
    const row = instructionsSheet.addRow({ guide: text });
    if (text.startsWith("\u{1F4CB}") || text.startsWith("\u{1F464}") || text.startsWith("\u{1F4CA}") || text.startsWith("\u{1F522}") || text.startsWith("\u26A0\uFE0F")) {
      row.font = { bold: true, size: 12 };
    }
  });
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
async function processClientsImport(buffer, userId) {
  const result = {
    imported: 0,
    updated: 0,
    errors: [],
    success: false
  };
  try {
    if (!Buffer.isBuffer(buffer)) {
      result.errors.push("El archivo proporcionado no es v\xE1lido");
      return result;
    }
    const workbook = new ExcelJS2.Workbook();
    await workbook.xlsx.load(buffer);
    const clientsSheet = workbook.getWorksheet("Clientes");
    if (!clientsSheet) {
      result.errors.push('No se encontr\xF3 la hoja "Clientes" en el archivo');
      return result;
    }
    const clients = [];
    const validationErrors = [];
    clientsSheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const nifCif = String(row.getCell(1).value || "").trim();
      const razonSocial = String(row.getCell(2).value || "").trim();
      const tipo = String(row.getCell(3).value || "").trim().toUpperCase();
      if (!nifCif && !razonSocial) return;
      const emailCell = row.getCell(4).value;
      let email = void 0;
      if (emailCell) {
        if (typeof emailCell === "string") {
          email = emailCell.trim();
        } else if (typeof emailCell === "object" && emailCell !== null && "text" in emailCell) {
          email = String(emailCell.text || "").trim();
        } else {
          email = String(emailCell).trim();
        }
        if (email === "" || email === "[object Object]") email = void 0;
      }
      clients.push({
        nifCif,
        razonSocial,
        tipo,
        email,
        telefono: String(row.getCell(5).value || "").trim() || void 0,
        direccion: String(row.getCell(6).value || "").trim() || void 0,
        codigoPostal: String(row.getCell(7).value || "").trim() || void 0,
        ciudad: String(row.getCell(8).value || "").trim() || void 0,
        pais: String(row.getCell(9).value || "").trim() || void 0,
        gestor: String(row.getCell(10).value || "").trim() || void 0,
        fechaAlta: parseDateCell(row.getCell(11).value),
        activo: parseActiveCell(row.getCell(12).value),
        notas: String(row.getCell(13).value || "").trim() || void 0
      });
    });
    const clientsMap = /* @__PURE__ */ new Map();
    for (let i = 0; i < clients.length; i++) {
      const client = clients[i];
      const rowNumber = i + 2;
      const errors = await validateClientRow(client, rowNumber);
      validationErrors.push(...errors);
      if (errors.length === 0) {
        clientsMap.set(client.nifCif, client);
      }
    }
    if (validationErrors.length > 0) {
      result.errors = validationErrors.map((e) => `[${e.sheet}] Fila ${e.row}, ${e.field}: ${e.message}`);
      return result;
    }
    const users = await prisma_client_default.users.findMany({
      select: { id: true, username: true }
    });
    const usersMap = new Map(users.map((u) => [u.username.toLowerCase(), u.id]));
    for (const clientData of clientsMap.values()) {
      try {
        const gestorId = clientData.gestor ? usersMap.get(clientData.gestor.toLowerCase()) || null : null;
        const existing = await prisma_client_default.clients.findFirst({
          where: { nifCif: clientData.nifCif }
        });
        let direccionCompleta = clientData.direccion || "";
        if (clientData.codigoPostal || clientData.ciudad || clientData.pais) {
          const partes = [
            direccionCompleta,
            clientData.codigoPostal,
            clientData.ciudad,
            clientData.pais
          ].filter((p) => p && p.trim());
          direccionCompleta = partes.join(", ");
        }
        const clientPayload = {
          razonSocial: clientData.razonSocial,
          nifCif: clientData.nifCif,
          tipo: clientData.tipo,
          email: clientData.email || null,
          telefono: clientData.telefono || null,
          direccion: direccionCompleta || null,
          responsableAsignado: gestorId,
          fechaAlta: clientData.fechaAlta || /* @__PURE__ */ new Date(),
          isActive: clientData.activo !== false,
          notes: clientData.notas || null
        };
        let clientId;
        if (existing) {
          await prisma_client_default.clients.update({
            where: { id: existing.id },
            data: clientPayload
          });
          clientId = existing.id;
          result.updated++;
        } else {
          const newClient = await prisma_client_default.clients.create({
            data: {
              id: randomUUID4(),
              ...clientPayload
            }
          });
          clientId = newClient.id;
          result.imported++;
        }
      } catch (error) {
        result.errors.push(`Error al importar cliente ${clientData.nifCif}: ${error.message}`);
      }
    }
    result.success = result.imported > 0 || result.updated > 0;
    return result;
  } catch (error) {
    result.errors.push(`Error procesando el archivo: ${error.message}`);
    return result;
  }
}
async function validateClientRow(client, rowNumber) {
  const errors = [];
  if (!client.nifCif) {
    errors.push({
      row: rowNumber,
      sheet: "Clientes",
      field: "NIF/CIF",
      message: "Campo obligatorio"
    });
  }
  if (!client.razonSocial) {
    errors.push({
      row: rowNumber,
      sheet: "Clientes",
      field: "Raz\xF3n Social",
      message: "Campo obligatorio"
    });
  }
  const validTypes = ["EMPRESA", "AUTONOMO", "PARTICULAR"];
  if (!client.tipo) {
    errors.push({
      row: rowNumber,
      sheet: "Clientes",
      field: "Tipo",
      message: "Campo obligatorio"
    });
  } else if (!validTypes.includes(client.tipo)) {
    errors.push({
      row: rowNumber,
      sheet: "Clientes",
      field: "Tipo",
      message: `Debe ser uno de: ${validTypes.join(", ")}`
    });
  }
  return errors;
}
function parseDateCell(value) {
  if (!value) return void 0;
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  if (typeof value === "number") {
    const excelEpoch = new Date(1900, 0, 1);
    const date = new Date(excelEpoch.getTime() + (value - 2) * 864e5);
    return date;
  }
  return void 0;
}
function parseActiveCell(value) {
  if (typeof value === "boolean") return value;
  const str = String(value || "").trim().toUpperCase();
  if (str === "SI" || str === "S\xCD" || str === "YES" || str === "TRUE" || str === "1") return true;
  if (str === "NO" || str === "FALSE" || str === "0") return false;
  return true;
}

// server/budget-parameters.ts
init_prisma_client();
import { Router } from "express";
init_calculateAutonomo();
var router6 = Router();
function ensureAdmin(req, res, next) {
  const roleName = req.user?.roleName;
  if (roleName === "Administrador") return next();
  return res.status(403).json({ error: "Solo administradores pueden editar par\xE1metros" });
}
router6.get("/", authenticateToken, async (req, res) => {
  try {
    const { type } = req.query;
    const where = { isActive: true };
    if (type) {
      where.budgetType = String(type).toUpperCase();
    }
    const parameters = await prisma_client_default.budget_parameters.findMany({
      where,
      orderBy: [
        { budgetType: "asc" },
        { category: "asc" },
        { minRange: "asc" }
      ]
    });
    const grouped = parameters.reduce((acc, param) => {
      const type2 = param.budgetType;
      if (!acc[type2]) {
        acc[type2] = [];
      }
      acc[type2].push({
        id: param.id,
        category: param.category,
        subcategory: param.subcategory,
        key: param.paramKey,
        label: param.paramLabel,
        value: Number(param.paramValue),
        minRange: param.minRange,
        maxRange: param.maxRange,
        description: param.description
      });
      return acc;
    }, {});
    res.json(grouped);
  } catch (error) {
    console.error("Error al obtener par\xE1metros:", error);
    res.status(500).json({ error: error.message });
  }
});
router6.get("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const parameter = await prisma_client_default.budget_parameters.findUnique({
      where: { id }
    });
    if (!parameter) {
      return res.status(404).json({ error: "Par\xE1metro no encontrado" });
    }
    res.json({
      id: parameter.id,
      budgetType: parameter.budgetType,
      category: parameter.category,
      subcategory: parameter.subcategory,
      key: parameter.paramKey,
      label: parameter.paramLabel,
      value: Number(parameter.paramValue),
      minRange: parameter.minRange,
      maxRange: parameter.maxRange,
      description: parameter.description,
      isActive: parameter.isActive
    });
  } catch (error) {
    console.error("Error al obtener par\xE1metro:", error);
    res.status(500).json({ error: error.message });
  }
});
router6.put("/:id", authenticateToken, ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { value, label, description } = req.body;
    if (value === void 0 || value === null) {
      return res.status(400).json({ error: "El valor es requerido" });
    }
    const numValue = Number(value);
    if (isNaN(numValue)) {
      return res.status(400).json({ error: "El valor debe ser un n\xFAmero" });
    }
    const updateData = { paramValue: numValue };
    if (label !== void 0) updateData.paramLabel = label;
    if (description !== void 0) updateData.description = description;
    const updated = await prisma_client_default.budget_parameters.update({
      where: { id },
      data: updateData
    });
    console.log(`\u2705 Par\xE1metro actualizado: ${updated.paramKey} = ${numValue}\u20AC (por ${req.user?.username})`);
    switch (updated.budgetType) {
      case "PYME":
        clearParametersCache();
        break;
      case "AUTONOMO":
        clearConfigCache();
        break;
      case "RENTA":
        clearParametersCache2();
        break;
      case "HERENCIAS":
        clearParametersCache3();
        break;
    }
    res.json({
      id: updated.id,
      budgetType: updated.budgetType,
      category: updated.category,
      key: updated.paramKey,
      label: updated.paramLabel,
      value: Number(updated.paramValue),
      minRange: updated.minRange,
      maxRange: updated.maxRange
    });
  } catch (error) {
    console.error("Error al actualizar par\xE1metro:", error);
    res.status(500).json({ error: error.message });
  }
});
router6.put("/bulk/update", authenticateToken, ensureAdmin, async (req, res) => {
  try {
    const { updates } = req.body;
    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ error: "Se requiere un array de actualizaciones" });
    }
    const results = await Promise.all(
      updates.map(async (update) => {
        const { id, value } = update;
        if (!id || value === void 0) return null;
        return await prisma_client_default.budget_parameters.update({
          where: { id },
          data: { paramValue: Number(value) }
        });
      })
    );
    const successful = results.filter((r) => r !== null).length;
    console.log(`\u2705 Actualizaci\xF3n masiva: ${successful}/${updates.length} par\xE1metros (por ${req.user?.username})`);
    clearParametersCache();
    clearConfigCache();
    clearParametersCache2();
    clearParametersCache3();
    res.json({
      updated: successful,
      total: updates.length
    });
  } catch (error) {
    console.error("Error en actualizaci\xF3n masiva:", error);
    res.status(500).json({ error: error.message });
  }
});
router6.post("/reset/:type", authenticateToken, ensureAdmin, async (req, res) => {
  try {
    const { type } = req.params;
    const budgetType = String(type).toUpperCase();
    if (!["PYME", "AUTONOMO", "RENTA", "HERENCIAS"].includes(budgetType)) {
      return res.status(400).json({ error: "Tipo de presupuesto inv\xE1lido" });
    }
    console.log(`\u26A0\uFE0F  Solicitud de reset de par\xE1metros ${budgetType} (por ${req.user?.username})`);
    res.json({
      message: `Par\xE1metros de ${budgetType} listos para restaurar`,
      warning: "Funci\xF3n de reset pendiente de implementar"
    });
  } catch (error) {
    console.error("Error al resetear par\xE1metros:", error);
    res.status(500).json({ error: error.message });
  }
});
var budget_parameters_default = router6;

// server/budget-templates.ts
init_prisma_client();
import express6 from "express";
import { randomUUID as randomUUID5 } from "crypto";
var router7 = express6.Router();
router7.use(authenticateToken);
router7.use(checkIsAdmin);
router7.get("/", async (req, res) => {
  try {
    const { type, companyBrand, isActive, isDefault } = req.query;
    const where = {};
    if (type) where.type = type;
    if (companyBrand) where.companyBrand = companyBrand;
    if (isActive !== void 0) where.isActive = isActive === "true";
    if (isDefault !== void 0) where.isDefault = isDefault === "true";
    const templates = await prisma_client_default.budget_templates.findMany({
      where,
      orderBy: { updatedAt: "desc" }
    });
    res.json(templates);
    logger_default.info(`Plantillas listadas: ${templates.length} encontradas`);
  } catch (error) {
    logger_default.error({ error }, "Error al listar plantillas");
    res.status(500).json({
      message: "Error al listar las plantillas de presupuesto",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});
router7.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const template = await prisma_client_default.budget_templates.findUnique({
      where: { id }
    });
    if (!template) {
      return res.status(404).json({ message: "Plantilla no encontrada" });
    }
    res.json(template);
    logger_default.info(`Plantilla obtenida: ${template.name}`);
  } catch (error) {
    logger_default.error({ error }, "Error al obtener plantilla");
    res.status(500).json({
      message: "Error al obtener la plantilla",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});
router7.post("/", async (req, res) => {
  try {
    const {
      name,
      description,
      type,
      companyBrand,
      htmlContent,
      availableVars,
      customCss,
      isDefault,
      isActive
    } = req.body;
    if (!name || !type || !htmlContent) {
      return res.status(400).json({
        message: "Faltan campos requeridos: name, type, htmlContent"
      });
    }
    if (isDefault) {
      await prisma_client_default.budget_templates.updateMany({
        where: {
          type,
          companyBrand: companyBrand || "LA_LLAVE",
          isDefault: true
        },
        data: { isDefault: false }
      });
    }
    const template = await prisma_client_default.budget_templates.create({
      data: {
        id: randomUUID5(),
        name,
        description,
        type,
        companyBrand: companyBrand || "LA_LLAVE",
        htmlContent,
        availableVars,
        customCss,
        isDefault: isDefault || false,
        isActive: isActive !== void 0 ? isActive : true,
        createdBy: req.user?.id,
        updatedBy: req.user?.id,
        updatedAt: /* @__PURE__ */ new Date()
      }
    });
    res.status(201).json(template);
    logger_default.info(`Plantilla creada: ${template.name} (${template.id})`);
  } catch (error) {
    logger_default.error({ error }, "Error al crear plantilla");
    res.status(500).json({
      message: "Error al crear la plantilla",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});
router7.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      type,
      companyBrand,
      htmlContent,
      availableVars,
      customCss,
      isDefault,
      isActive
    } = req.body;
    const existing = await prisma_client_default.budget_templates.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: "Plantilla no encontrada" });
    }
    if (isDefault && !existing.isDefault) {
      await prisma_client_default.budget_templates.updateMany({
        where: {
          type: type || existing.type,
          companyBrand: companyBrand || existing.companyBrand,
          isDefault: true,
          id: { not: id }
        },
        data: { isDefault: false }
      });
    }
    const template = await prisma_client_default.budget_templates.update({
      where: { id },
      data: {
        name,
        description,
        type,
        companyBrand,
        htmlContent,
        availableVars,
        customCss,
        isDefault,
        isActive,
        updatedBy: req.user?.id,
        updatedAt: /* @__PURE__ */ new Date()
      }
    });
    res.json(template);
    logger_default.info(`Plantilla actualizada: ${template.name} (${template.id})`);
  } catch (error) {
    logger_default.error({ error }, "Error al actualizar plantilla");
    res.status(500).json({
      message: "Error al actualizar la plantilla",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});
router7.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma_client_default.budget_templates.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: "Plantilla no encontrada" });
    }
    if (existing.isDefault) {
      return res.status(400).json({
        message: "No se puede eliminar una plantilla predeterminada. Primero marca otra como predeterminada."
      });
    }
    await prisma_client_default.budget_templates.delete({ where: { id } });
    res.json({ message: "Plantilla eliminada exitosamente" });
    logger_default.info(`Plantilla eliminada: ${existing.name} (${id})`);
  } catch (error) {
    logger_default.error({ error }, "Error al eliminar plantilla");
    res.status(500).json({
      message: "Error al eliminar la plantilla",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});
router7.post("/:id/set-default", async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma_client_default.budget_templates.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: "Plantilla no encontrada" });
    }
    await prisma_client_default.budget_templates.updateMany({
      where: {
        type: existing.type,
        companyBrand: existing.companyBrand,
        isDefault: true,
        id: { not: id }
      },
      data: { isDefault: false }
    });
    const template = await prisma_client_default.budget_templates.update({
      where: { id },
      data: {
        isDefault: true,
        updatedBy: req.user?.id,
        updatedAt: /* @__PURE__ */ new Date()
      }
    });
    res.json(template);
    logger_default.info(`Plantilla marcada como predeterminada: ${template.name} (${template.id})`);
  } catch (error) {
    logger_default.error({ error }, "Error al marcar plantilla como predeterminada");
    res.status(500).json({
      message: "Error al marcar la plantilla como predeterminada",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});
var budget_templates_default = router7;

// server/routes/documents.routes.ts
import { Router as Router2 } from "express";

// server/services/documents.service.ts
init_prisma_client();
import { nanoid } from "nanoid";
var DocumentsService = class {
  /**
   * Generar siguiente número de recibo
   */
  async getNextReceiptNumber(year) {
    const lastReceipt = await prisma_client_default.receipts.findFirst({
      where: { year },
      orderBy: { sequential: "desc" }
    });
    const sequential = lastReceipt ? lastReceipt.sequential + 1 : 1;
    const numero = `REC-${year}-${sequential.toString().padStart(4, "0")}`;
    return { numero, sequential };
  }
  /**
   * Crear recibo
   */
  async createReceipt(data) {
    const year = (/* @__PURE__ */ new Date()).getFullYear();
    const { numero, sequential } = await this.getNextReceiptNumber(year);
    const iva_porcentaje = data.iva_porcentaje || 21;
    const iva_importe = data.base_imponible * iva_porcentaje / 100;
    const total = data.base_imponible + iva_importe;
    return await prisma_client_default.receipts.create({
      data: {
        id: nanoid(),
        numero,
        year,
        sequential,
        client_id: data.clientId || null,
        recipient_name: data.recipient_name,
        recipient_nif: data.recipient_nif,
        recipient_email: data.recipient_email,
        recipient_address: data.recipient_address,
        concepto: data.concepto,
        base_imponible: data.base_imponible,
        iva_porcentaje,
        iva_importe,
        total,
        notes: data.notes,
        status: "BORRADOR",
        created_by: data.createdBy
      },
      include: {
        clients: true,
        creator: { select: { id: true, username: true, email: true } }
      }
    });
  }
  /**
   * Listar recibos
   */
  async listReceipts(filters) {
    const where = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.clientId) where.client_id = filters.clientId;
    if (filters?.year) where.year = filters.year;
    return await prisma_client_default.receipts.findMany({
      where,
      include: {
        clients: true,
        creator: { select: { id: true, username: true, email: true } }
      },
      orderBy: [{ year: "desc" }, { sequential: "desc" }]
    });
  }
  /**
   * Obtener recibo por ID
   */
  async getReceiptById(id) {
    const receipt = await prisma_client_default.receipts.findUnique({
      where: { id },
      include: {
        clients: true,
        creator: { select: { id: true, username: true, email: true } }
      }
    });
    if (!receipt) throw new Error("Recibo no encontrado");
    return receipt;
  }
  /**
   * Actualizar recibo
   */
  async updateReceipt(id, data) {
    const { clientId, ...updateData } = data;
    if (updateData.base_imponible !== void 0 || updateData.iva_porcentaje !== void 0) {
      const receipt = await prisma_client_default.receipts.findUnique({ where: { id } });
      if (!receipt) throw new Error("Recibo no encontrado");
      const base = updateData.base_imponible ?? receipt.base_imponible;
      const ivaPct = updateData.iva_porcentaje ?? receipt.iva_porcentaje;
      updateData.iva_importe = Number(base) * Number(ivaPct) / 100;
      updateData.total = Number(base) + updateData.iva_importe;
    }
    const prismaUpdate = { ...updateData };
    if (clientId !== void 0) {
      if (clientId) {
        prismaUpdate.clients = { connect: { id: clientId } };
      } else {
        prismaUpdate.clients = { disconnect: true };
      }
    }
    return await prisma_client_default.receipts.update({
      where: { id },
      data: prismaUpdate,
      include: { clients: true }
    });
  }
  /**
   * Crear documento
   */
  async createDocument(data) {
    const client = await prisma_client_default.clients.findUnique({
      where: { id: data.clientId }
    });
    if (!client) throw new Error("Cliente no encontrado");
    const docName = data.type === "DATA_PROTECTION" ? `Protecci\xF3n de Datos - ${client.razonSocial}` : `Domiciliaci\xF3n Bancaria - ${client.razonSocial}`;
    return await prisma_client_default.documents.create({
      data: {
        id: nanoid(),
        type: data.type,
        name: docName,
        description: data.notes,
        template_id: data.templateId,
        client_id: data.clientId,
        created_by: data.createdBy,
        status: "BORRADOR",
        signature_status: "PENDIENTE"
      },
      include: {
        clients: true,
        template: true,
        users: { select: { id: true, username: true, email: true } }
      }
    });
  }
  /**
   * Listar documentos
   */
  async listDocuments(filters) {
    const where = {};
    if (filters?.type) where.type = filters.type;
    if (filters?.status) where.status = filters.status;
    if (filters?.clientId) where.client_id = filters.clientId;
    return await prisma_client_default.documents.findMany({
      where,
      include: {
        clients: true,
        template: true,
        users: { select: { id: true, username: true, email: true } }
      },
      orderBy: { created_at: "desc" }
    });
  }
  /**
   * Obtener documento por ID
   */
  async getDocumentById(id) {
    const doc = await prisma_client_default.documents.findUnique({
      where: { id },
      include: {
        clients: true,
        template: true,
        users: { select: { id: true, username: true, email: true } },
        versions: true
      }
    });
    if (!doc) throw new Error("Documento no encontrado");
    return doc;
  }
  /**
   * Actualizar documento
   */
  async updateDocument(id, data) {
    return await prisma_client_default.documents.update({
      where: { id },
      data,
      include: { clients: true }
    });
  }
  /**
   * Marcar documento como aceptado
   */
  async markDocumentAsAccepted(documentId, signedFilePath, userId) {
    return await prisma_client_default.documents.update({
      where: { id: documentId },
      data: {
        status: "ACEPTADO",
        signature_status: "FIRMADO",
        signature_date: /* @__PURE__ */ new Date(),
        file_path: signedFilePath,
        signed_by: userId
      },
      include: { clients: true }
    });
  }
  /**
   * CRUD Plantillas
   */
  async createTemplate(data) {
    return await prisma_client_default.document_templates.create({
      data: {
        id: nanoid(),
        type: data.type,
        name: data.name,
        content: data.content,
        description: data.description,
        available_vars: JSON.stringify([]),
        is_active: true
      }
    });
  }
  async listTemplates(filters) {
    const where = {};
    if (filters?.type) where.type = filters.type;
    if (filters?.isActive !== void 0) where.is_active = filters.isActive;
    return await prisma_client_default.document_templates.findMany({
      where,
      orderBy: { created_at: "desc" }
    });
  }
  async getTemplateById(id) {
    const template = await prisma_client_default.document_templates.findUnique({
      where: { id }
    });
    if (!template) throw new Error("Plantilla no encontrada");
    return template;
  }
  async updateTemplate(id, data) {
    if (data.is_active === true) {
      const template = await prisma_client_default.document_templates.findUnique({
        where: { id }
      });
      if (template && template.type === "RECEIPT") {
        await prisma_client_default.document_templates.updateMany({
          where: {
            type: "RECEIPT",
            id: { not: id }
          },
          data: { is_active: false }
        });
      }
    }
    return await prisma_client_default.document_templates.update({
      where: { id },
      data: { ...data, updated_at: /* @__PURE__ */ new Date() }
    });
  }
  async deleteTemplate(id) {
    const count = await prisma_client_default.documents.count({ where: { template_id: id } });
    if (count > 0) {
      throw new Error(`No se puede eliminar: ${count} documentos la usan`);
    }
    await prisma_client_default.document_templates.delete({ where: { id } });
    return { success: true };
  }
};
var documentsService = new DocumentsService();

// server/services/document-pdf.service.ts
import puppeteer3 from "puppeteer";
import path5 from "path";
import fs5 from "fs/promises";
import { PrismaClient as PrismaClient12 } from "@prisma/client";
var prisma12 = new PrismaClient12();
var DocumentPdfService = class {
  constructor() {
    this.uploadsDir = path5.join(process.cwd(), "uploads", "documents");
    this.ensureUploadsDirExists();
  }
  async ensureUploadsDirExists() {
    try {
      await fs5.access(this.uploadsDir);
    } catch {
      await fs5.mkdir(this.uploadsDir, { recursive: true });
    }
  }
  /**
   * Generar PDF de recibo
   */
  async generateReceiptPdf(receipt) {
    const html = await this.buildReceiptHtml(receipt);
    const filename = `recibo-${receipt.numero}.pdf`;
    const pdfPath = path5.join(this.uploadsDir, filename);
    await this.generatePdfFromHtml(html, pdfPath);
    return `/uploads/documents/${filename}`;
  }
  /**
   * Generar PDF de documento
   */
  async generateDocumentPdf(document) {
    if (!document.template || !document.clients) {
      throw new Error("Documento sin plantilla o cliente");
    }
    const html = this.buildDocumentHtml(document);
    const filename = `${document.type}-${document.clients.nifCif}-${Date.now()}.pdf`;
    const pdfPath = path5.join(this.uploadsDir, filename);
    await this.generatePdfFromHtml(html, pdfPath);
    return `/uploads/documents/${filename}`;
  }
  /**
   * HTML para recibo
   */
  async buildReceiptHtml(receipt) {
    const template = await prisma12.document_templates.findFirst({
      where: { type: "RECEIPT", is_active: true },
      orderBy: { created_at: "desc" }
    });
    const client = receipt.clients;
    const nombre = client?.razonSocial || receipt.recipient_name;
    const nif = client?.nifCif || receipt.recipient_nif;
    const email = client?.email || receipt.recipient_email;
    if (template && template.content) {
      return template.content.replace(/{{NUMERO}}/g, receipt.numero || "").replace(/{{NOMBRE}}/g, nombre || "").replace(/{{NIF}}/g, nif || "").replace(/{{EMAIL}}/g, email || "").replace(/{{FECHA}}/g, new Date(receipt.created_at).toLocaleDateString("es-ES")).replace(/{{CONCEPTO}}/g, receipt.concepto || "").replace(/{{BASE}}/g, Number(receipt.base_imponible).toFixed(2)).replace(/{{IVA_PORCENTAJE}}/g, String(receipt.iva_porcentaje || 21)).replace(/{{IVA_IMPORTE}}/g, Number(receipt.iva_importe).toFixed(2)).replace(/{{TOTAL}}/g, Number(receipt.total).toFixed(2)).replace(/{{NOTAS}}/g, receipt.notes || "");
    }
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
    .header { text-align: center; margin-bottom: 40px; border-bottom: 3px solid #1e40af; padding-bottom: 20px; }
    .header h1 { color: #1e40af; font-size: 32px; }
    .info { margin: 20px 0; }
    .info-row { display: flex; margin-bottom: 8px; }
    .label { font-weight: bold; width: 150px; }
    table { width: 100%; margin: 30px 0; border-collapse: collapse; }
    th { background: #1e40af; color: white; padding: 12px; text-align: left; }
    td { padding: 12px; border-bottom: 1px solid #ddd; }
    .amount { text-align: right; font-weight: bold; }
    .total-row { background: #f3f4f6; font-size: 18px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>RECIBO</h1>
    <div>${receipt.numero}</div>
  </div>
  <div class="info">
    <div class="info-row"><div class="label">Nombre:</div><div>${nombre}</div></div>
    <div class="info-row"><div class="label">NIF/CIF:</div><div>${nif}</div></div>
    <div class="info-row"><div class="label">Email:</div><div>${email}</div></div>
    <div class="info-row"><div class="label">Fecha:</div><div>${new Date(receipt.created_at).toLocaleDateString("es-ES")}</div></div>
  </div>
  <table>
    <tr><th>Concepto</th><th class="amount">Base</th><th class="amount">IVA (${receipt.iva_porcentaje}%)</th><th class="amount">Total</th></tr>
    <tr><td>${receipt.concepto}</td><td class="amount">${Number(receipt.base_imponible).toFixed(2)} \u20AC</td><td class="amount">${Number(receipt.iva_importe).toFixed(2)} \u20AC</td><td class="amount">${Number(receipt.total).toFixed(2)} \u20AC</td></tr>
    <tr class="total-row"><td colspan="3">TOTAL</td><td class="amount">${Number(receipt.total).toFixed(2)} \u20AC</td></tr>
  </table>
  ${receipt.notes ? `<div style="padding:15px;background:#fef3c7;border-left:4px solid #f59e0b;"><strong>Notas:</strong> ${receipt.notes}</div>` : ""}
</body>
</html>
    `;
  }
  /**
   * HTML para documento
   */
  buildDocumentHtml(document) {
    const client = document.clients;
    const content = document.template.content || "<p>Sin contenido</p>";
    let html = content.replace(/{{CLIENTE_NOMBRE}}/g, client.razonSocial || "").replace(/{{CLIENTE_NIF}}/g, client.nifCif || "").replace(/{{CLIENTE_EMAIL}}/g, client.email || "").replace(/{{FECHA}}/g, (/* @__PURE__ */ new Date()).toLocaleDateString("es-ES"));
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; padding: 40px; line-height: 1.6; }
    h1 { color: #1e40af; margin-bottom: 20px; }
    p { margin-bottom: 10px; }
  </style>
</head>
<body>
  ${html}
</body>
</html>
    `;
  }
  /**
   * Generar PDF con Puppeteer
   */
  async generatePdfFromHtml(html, outputPath) {
    const browser = await puppeteer3.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
    });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0" });
      await page.pdf({
        path: outputPath,
        format: "A4",
        margin: { top: "20mm", right: "15mm", bottom: "20mm", left: "15mm" },
        printBackground: true
      });
    } finally {
      await browser.close();
    }
  }
};
var documentPdfService = new DocumentPdfService();

// server/services/document-email.service.ts
init_prisma_client();
import nodemailer5 from "nodemailer";
import fs6 from "fs/promises";
var DocumentEmailService = class {
  /**
   * Obtener configuración SMTP
   */
  async getSmtpConfig() {
    const smtp = await prisma_client_default.smtp_accounts.findFirst({
      where: { activa: true, is_predeterminada: true }
    });
    if (!smtp) {
      const any = await prisma_client_default.smtp_accounts.findFirst({ where: { activa: true } });
      if (!any) throw new Error("No hay cuentas SMTP activas");
      return any;
    }
    return smtp;
  }
  /**
   * Crear transporter
   */
  async createTransporter() {
    const config = await this.getSmtpConfig();
    return nodemailer5.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: { user: config.user, pass: config.password }
    });
  }
  /**
   * Enviar recibo
   */
  async sendReceiptEmail(receiptId, pdfPath, to) {
    const receipt = await prisma_client_default.receipts.findUnique({
      where: { id: receiptId },
      include: { clients: true }
    });
    if (!receipt) throw new Error("Recibo no encontrado");
    const nombre = receipt.clients?.razonSocial || receipt.recipient_name;
    const subject = `Recibo ${receipt.numero}`;
    const message = `
Estimado/a ${nombre},

Adjunto encontrar\xE1 el recibo n\xFAmero ${receipt.numero} por importe de ${Number(receipt.total).toFixed(2)} \u20AC.

Concepto: ${receipt.concepto}

Saludos cordiales,
Asesor\xEDa La Llave
    `.trim();
    const transporter2 = await this.createTransporter();
    const pdfBuffer = await fs6.readFile(pdfPath);
    await transporter2.sendMail({
      from: '"Asesor\xEDa La Llave" <noreply@asesorialalllave.com>',
      to,
      subject,
      text: message,
      attachments: [{ filename: `recibo-${receipt.numero}.pdf`, content: pdfBuffer }]
    });
    await prisma_client_default.receipts.update({
      where: { id: receiptId },
      data: { status: "ENVIADO", sent_at: /* @__PURE__ */ new Date() }
    });
  }
  /**
   * Enviar documento
   */
  async sendDocumentEmail(documentId, pdfPath, to) {
    const doc = await prisma_client_default.documents.findUnique({
      where: { id: documentId },
      include: { clients: true }
    });
    if (!doc) throw new Error("Documento no encontrado");
    const typeName = doc.type === "DATA_PROTECTION" ? "Protecci\xF3n de Datos" : "Domiciliaci\xF3n Bancaria";
    const subject = `${typeName} - ${doc.clients.razonSocial}`;
    const message = `
Estimado/a ${doc.clients.razonSocial},

Adjunto encontrar\xE1 el documento de ${typeName} para su firma.

Por favor, revise, firme y env\xEDenos una copia firmada.

Saludos cordiales,
Asesor\xEDa La Llave
    `.trim();
    const transporter2 = await this.createTransporter();
    const pdfBuffer = await fs6.readFile(pdfPath);
    await transporter2.sendMail({
      from: '"Asesor\xEDa La Llave" <noreply@asesorialalllave.com>',
      to,
      subject,
      text: message,
      attachments: [{ filename: `${doc.type}-${doc.clients.nifCif}.pdf`, content: pdfBuffer }]
    });
    await prisma_client_default.documents.update({
      where: { id: documentId },
      data: { status: "ENVIADO", sent_at: /* @__PURE__ */ new Date() }
    });
  }
};
var documentEmailService = new DocumentEmailService();

// server/routes/documents.routes.ts
import multer from "multer";
import path6 from "path";
import { nanoid as nanoid2 } from "nanoid";
var router8 = Router2();
var storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path6.join(process.cwd(), "uploads", "documents", "signed"));
  },
  filename: (req, file, cb) => {
    const uniqueName = `${nanoid2()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});
var upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Solo se permiten archivos PDF"));
    }
  }
});
router8.post("/receipts", authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Usuario no autenticado" });
    }
    const receipt = await documentsService.createReceipt({
      ...req.body,
      createdBy: userId
    });
    res.status(201).json(receipt);
  } catch (error) {
    console.error("Error creating receipt:", error);
    res.status(500).json({ error: error.message || "Error al crear recibo" });
  }
});
router8.get("/receipts", authenticateToken, async (req, res) => {
  try {
    const { status, clientId, year } = req.query;
    const receipts = await documentsService.listReceipts({
      status,
      clientId,
      year: year ? parseInt(year) : void 0
    });
    res.json(receipts);
  } catch (error) {
    console.error("Error listing receipts:", error);
    res.status(500).json({ error: error.message || "Error al listar recibos" });
  }
});
router8.get("/receipts/:id", authenticateToken, async (req, res) => {
  try {
    const receipt = await documentsService.getReceiptById(req.params.id);
    res.json(receipt);
  } catch (error) {
    console.error("Error getting receipt:", error);
    res.status(404).json({ error: error.message || "Recibo no encontrado" });
  }
});
router8.put("/receipts/:id", authenticateToken, async (req, res) => {
  try {
    let receipt = await documentsService.updateReceipt(req.params.id, req.body);
    try {
      const pdfPath = await documentPdfService.generateReceiptPdf(receipt);
      await documentsService.updateReceipt(req.params.id, { pdf_path: pdfPath, pdf_generated_at: /* @__PURE__ */ new Date() });
      receipt.pdf_path = pdfPath;
      receipt.pdf_generated_at = /* @__PURE__ */ new Date();
    } catch (pdfErr) {
      console.error("Error regenerating PDF after update:", pdfErr);
    }
    res.json(receipt);
  } catch (error) {
    console.error("Error updating receipt:", error);
    res.status(500).json({ error: error.message || "Error al actualizar recibo" });
  }
});
router8.post("/receipts/:id/generate-pdf", authenticateToken, async (req, res) => {
  try {
    const receipt = await documentsService.getReceiptById(req.params.id);
    const pdfPath = await documentPdfService.generateReceiptPdf(receipt);
    await documentsService.updateReceipt(req.params.id, { pdf_path: pdfPath });
    res.json({
      success: true,
      message: "PDF generado correctamente",
      pdfPath
    });
  } catch (error) {
    console.error("Error generating receipt PDF:", error);
    res.status(500).json({ error: error.message || "Error al generar PDF" });
  }
});
router8.post("/receipts/:id/send", authenticateToken, async (req, res) => {
  try {
    const { to, subject, message } = req.body;
    const receipt = await documentsService.getReceiptById(req.params.id);
    if (!receipt.pdf_path) {
      return res.status(400).json({ error: "Debe generar el PDF primero" });
    }
    await documentEmailService.sendReceiptEmail(req.params.id, receipt.pdf_path, to || receipt.recipient_email);
    res.json({
      success: true,
      message: "Recibo enviado correctamente"
    });
  } catch (error) {
    console.error("Error sending receipt:", error);
    res.status(500).json({ error: error.message || "Error al enviar recibo" });
  }
});
router8.post("/documents", authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Usuario no autenticado" });
    }
    const document = await documentsService.createDocument({
      ...req.body,
      createdBy: userId
    });
    res.status(201).json(document);
  } catch (error) {
    console.error("Error creating document:", error);
    res.status(500).json({ error: error.message || "Error al crear documento" });
  }
});
router8.get("/documents", authenticateToken, async (req, res) => {
  try {
    const { type, status, clientId } = req.query;
    const documents = await documentsService.listDocuments({
      type,
      status,
      clientId
    });
    res.json(documents);
  } catch (error) {
    console.error("Error listing documents:", error);
    res.status(500).json({ error: error.message || "Error al listar documentos" });
  }
});
router8.get("/documents/:id", authenticateToken, async (req, res) => {
  try {
    const document = await documentsService.getDocumentById(req.params.id);
    res.json(document);
  } catch (error) {
    console.error("Error getting document:", error);
    res.status(404).json({ error: error.message || "Documento no encontrado" });
  }
});
router8.post("/documents/:id/generate-pdf", authenticateToken, async (req, res) => {
  try {
    const document = await documentsService.getDocumentById(req.params.id);
    const pdfPath = await documentPdfService.generateDocumentPdf(document);
    await documentsService.updateDocument(req.params.id, { filePath: pdfPath });
    res.json({
      success: true,
      message: "PDF generado correctamente",
      pdfPath
    });
  } catch (error) {
    console.error("Error generating document PDF:", error);
    res.status(500).json({ error: error.message || "Error al generar PDF" });
  }
});
router8.post("/documents/:id/send", authenticateToken, async (req, res) => {
  try {
    const { to, subject, message } = req.body;
    const document = await documentsService.getDocumentById(req.params.id);
    if (!document.file_path) {
      return res.status(400).json({ error: "Debe generar el PDF primero" });
    }
    await documentEmailService.sendDocumentEmail(
      req.params.id,
      document.file_path,
      to || document.clients?.email
    );
    res.json({
      success: true,
      message: "Documento enviado correctamente"
    });
  } catch (error) {
    console.error("Error sending document:", error);
    res.status(500).json({ error: error.message || "Error al enviar documento" });
  }
});
router8.post(
  "/documents/:id/accept",
  authenticateToken,
  upload.single("signedFile"),
  async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Usuario no autenticado" });
      }
      if (!req.file) {
        return res.status(400).json({ error: "Debe adjuntar el archivo firmado" });
      }
      const document = await documentsService.markDocumentAsAccepted(
        req.params.id,
        req.file.path,
        userId
      );
      res.json({
        success: true,
        message: "Documento marcado como aceptado",
        document
      });
    } catch (error) {
      console.error("Error accepting document:", error);
      res.status(500).json({ error: error.message || "Error al aceptar documento" });
    }
  }
);
router8.post("/templates", authenticateToken, async (req, res) => {
  try {
    const template = await documentsService.createTemplate(req.body);
    res.status(201).json(template);
  } catch (error) {
    console.error("Error creating template:", error);
    res.status(500).json({ error: error.message || "Error al crear plantilla" });
  }
});
router8.get("/templates", authenticateToken, async (req, res) => {
  try {
    const { type, isActive } = req.query;
    const templates = await documentsService.listTemplates({
      type,
      isActive: isActive === "true" ? true : isActive === "false" ? false : void 0
    });
    res.json(templates);
  } catch (error) {
    console.error("Error listing templates:", error);
    res.status(500).json({ error: error.message || "Error al listar plantillas" });
  }
});
router8.get("/templates/:id", authenticateToken, async (req, res) => {
  try {
    const template = await documentsService.getTemplateById(req.params.id);
    res.json(template);
  } catch (error) {
    console.error("Error getting template:", error);
    res.status(404).json({ error: error.message || "Plantilla no encontrada" });
  }
});
router8.put("/templates/:id", authenticateToken, async (req, res) => {
  try {
    const template = await documentsService.updateTemplate(req.params.id, req.body);
    res.json(template);
  } catch (error) {
    console.error("Error updating template:", error);
    res.status(500).json({ error: error.message || "Error al actualizar plantilla" });
  }
});
router8.delete("/templates/:id", authenticateToken, async (req, res) => {
  try {
    await documentsService.deleteTemplate(req.params.id);
    res.json({ success: true, message: "Plantilla eliminada correctamente" });
  } catch (error) {
    console.error("Error deleting template:", error);
    res.status(500).json({ error: error.message || "Error al eliminar plantilla" });
  }
});
var documents_routes_default = router8;

// server/routes/github-updates.routes.ts
import express7 from "express";
import { PrismaClient as PrismaClient14 } from "@prisma/client";
import crypto3 from "crypto";
import { v4 as uuidv4 } from "uuid";
import { execSync } from "child_process";
var router9 = express7.Router();
var prisma14 = new PrismaClient14();
function verifyGitHubSignature(payload, signature, secret) {
  const hmac = crypto3.createHmac("sha256", secret);
  const digest = "sha256=" + hmac.update(payload).digest("hex");
  return crypto3.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}
router9.post("/webhook", async (req, res) => {
  try {
    const signature = req.headers["x-hub-signature-256"];
    const event = req.headers["x-github-event"];
    if (event !== "push") {
      return res.status(200).json({ message: "Event ignored" });
    }
    const config = await prisma14.system_update_config.findFirst();
    if (!config) {
      console.error("No GitHub config found");
      return res.status(500).json({ error: "Configuration not found" });
    }
    if (config.githubWebhookSecret && signature) {
      const payload = JSON.stringify(req.body);
      const isValid = verifyGitHubSignature(payload, signature, config.githubWebhookSecret);
      if (!isValid) {
        console.error("Invalid webhook signature");
        return res.status(401).json({ error: "Invalid signature" });
      }
    }
    const { commits, ref, repository, pusher } = req.body;
    const branch = ref.replace("refs/heads/", "");
    if (branch !== config.githubBranch) {
      console.log(`Ignoring push to branch ${branch}, configured branch is ${config.githubBranch}`);
      return res.status(200).json({ message: "Branch ignored" });
    }
    const lastCommit = commits[commits.length - 1];
    if (!lastCommit) {
      return res.status(400).json({ error: "No commits found" });
    }
    const commitHash = lastCommit.id;
    const commitMessage = lastCommit.message;
    const commitAuthor = lastCommit.author?.name || pusher?.name || "Unknown";
    const commitDate = new Date(lastCommit.timestamp);
    console.log(`Received GitHub webhook for commit ${commitHash.substring(0, 7)}: ${commitMessage}`);
    const existingUpdate = await prisma14.system_updates.findFirst({
      where: { commit_hash: commitHash }
    });
    if (existingUpdate) {
      console.log(`Update for commit ${commitHash.substring(0, 7)} already exists`);
      return res.status(200).json({ message: "Update already exists", updateId: existingUpdate.id });
    }
    const update = await prisma14.system_updates.create({
      data: {
        id: uuidv4(),
        update_type: "GITHUB",
        commit_hash: commitHash,
        commit_message: commitMessage,
        commit_author: commitAuthor,
        commit_date: commitDate,
        branch,
        status: "PENDING",
        auto_applied: false,
        logs: `Commit recibido desde GitHub:
Autor: ${commitAuthor}
Fecha: ${commitDate.toISOString()}
Mensaje: ${commitMessage}

`
      }
    });
    console.log(`Created update record ${update.id} for commit ${commitHash.substring(0, 7)}`);
    if (config.autoUpdateEnabled) {
      console.log("Auto-update enabled, triggering update...");
      const { executeGitUpdate: executeGitUpdate2 } = await Promise.resolve().then(() => (init_git_update_service(), git_update_service_exports));
      executeGitUpdate2(update.id).catch((err) => {
        console.error("Error executing auto-update:", err);
      });
      return res.status(200).json({
        message: "Update received and auto-apply triggered",
        updateId: update.id,
        autoApplied: true
      });
    }
    return res.status(200).json({
      message: "Update received",
      updateId: update.id,
      autoApplied: false
    });
  } catch (error) {
    console.error("Error processing GitHub webhook:", error);
    return res.status(500).json({ error: error.message });
  }
});
router9.get("/updates", async (req, res) => {
  try {
    const updates = await prisma14.system_updates.findMany({
      where: { update_type: "GITHUB" },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        users: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      }
    });
    return res.json(updates);
  } catch (error) {
    console.error("Error fetching GitHub updates:", error);
    return res.status(500).json({ error: error.message });
  }
});
router9.post("/updates/:id/apply", async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const update = await prisma14.system_updates.findUnique({
      where: { id }
    });
    if (!update) {
      return res.status(404).json({ error: "Update not found" });
    }
    if (update.status !== "PENDING" && update.status !== "FAILED") {
      return res.status(400).json({ error: `Cannot apply update with status ${update.status}` });
    }
    await prisma14.system_updates.update({
      where: { id },
      data: {
        initiated_by: userId,
        status: "APPLYING"
      }
    });
    const { executeGitUpdate: executeGitUpdate2 } = await Promise.resolve().then(() => (init_git_update_service(), git_update_service_exports));
    executeGitUpdate2(id).catch((err) => {
      console.error("Error executing update:", err);
    });
    return res.json({ message: "Update started", updateId: id });
  } catch (error) {
    console.error("Error applying update:", error);
    return res.status(500).json({ error: error.message });
  }
});
router9.get("/updates/:id/logs", async (req, res) => {
  try {
    const { id } = req.params;
    const update = await prisma14.system_updates.findUnique({
      where: { id },
      select: {
        id: true,
        commit_hash: true,
        commit_message: true,
        status: true,
        logs: true,
        error_message: true,
        createdAt: true,
        completed_at: true
      }
    });
    if (!update) {
      return res.status(404).json({ error: "Update not found" });
    }
    return res.json(update);
  } catch (error) {
    console.error("Error fetching update logs:", error);
    return res.status(500).json({ error: error.message });
  }
});
router9.get("/config", async (req, res) => {
  try {
    let config = await prisma14.system_update_config.findFirst();
    if (!config) {
      config = await prisma14.system_update_config.create({
        data: {
          id: uuidv4(),
          githubRepo: "",
          githubBranch: "main",
          autoUpdateEnabled: false
        }
      });
    }
    const { githubToken, githubWebhookSecret, ...safeConfig } = config;
    return res.json(safeConfig);
  } catch (error) {
    console.error("Error fetching GitHub config:", error);
    return res.status(500).json({ error: error.message });
  }
});
router9.put("/config", async (req, res) => {
  try {
    const { githubRepo, githubBranch, autoUpdateEnabled, githubToken, githubWebhookSecret } = req.body;
    let config = await prisma14.system_update_config.findFirst();
    const data = {};
    if (githubRepo !== void 0) data.githubRepo = githubRepo;
    if (githubBranch !== void 0) data.githubBranch = githubBranch;
    if (autoUpdateEnabled !== void 0) data.autoUpdateEnabled = autoUpdateEnabled;
    if (githubToken !== void 0) data.githubToken = githubToken;
    if (githubWebhookSecret !== void 0) data.githubWebhookSecret = githubWebhookSecret;
    if (config) {
      config = await prisma14.system_update_config.update({
        where: { id: config.id },
        data
      });
    } else {
      config = await prisma14.system_update_config.create({
        data: {
          id: uuidv4(),
          githubRepo: githubRepo || "",
          githubBranch: githubBranch || "main",
          autoUpdateEnabled: autoUpdateEnabled || false,
          githubToken: githubToken || null,
          githubWebhookSecret: githubWebhookSecret || null
        }
      });
    }
    const { githubToken: _, githubWebhookSecret: __, ...safeConfig } = config;
    return res.json(safeConfig);
  } catch (error) {
    console.error("Error updating GitHub config:", error);
    return res.status(500).json({ error: error.message });
  }
});
router9.get("/current-commit", async (req, res) => {
  try {
    const currentCommit = execSync("git rev-parse HEAD", {
      encoding: "utf-8",
      cwd: "/root/www/Asesoria-la-Llave-V2"
    }).trim();
    const currentBranch = execSync("git rev-parse --abbrev-ref HEAD", {
      encoding: "utf-8",
      cwd: "/root/www/Asesoria-la-Llave-V2"
    }).trim();
    return res.json({
      commitHash: currentCommit,
      branch: currentBranch
    });
  } catch (error) {
    console.error("Error getting current commit:", error);
    return res.status(500).json({ error: error.message });
  }
});
var github_updates_routes_default = router9;

// server/routes/tax-calendar.routes.ts
import { Router as Router3 } from "express";

// server/services/tax-calendar.service.ts
import { PrismaClient as PrismaClient15 } from "@prisma/client";
import { randomUUID as randomUUID6 } from "crypto";
var prisma15 = new PrismaClient15();
var TaxCalendarService = class {
  /**
   * Obtener todos los periodos del calendario fiscal
   */
  async getAllPeriods(filters) {
    const where = {};
    if (filters?.year) where.year = filters.year;
    if (filters?.modelCode) where.modelCode = filters.modelCode;
    if (filters?.status) where.status = filters.status;
    return await prisma15.tax_calendar.findMany({
      where,
      orderBy: [{ year: "desc" }, { modelCode: "asc" }, { period: "asc" }]
    });
  }
  /**
   * Obtener periodos ABIERTOS (fecha actual entre startDate y endDate)
   * Estos son los periodos en los que se deben generar obligaciones automáticamente
   */
  async getOpenPeriods(modelCode) {
    const today2 = /* @__PURE__ */ new Date();
    const where = {
      startDate: { lte: today2 },
      endDate: { gte: today2 },
      active: true
    };
    if (modelCode) {
      where.modelCode = modelCode;
    }
    return await prisma15.tax_calendar.findMany({
      where,
      orderBy: [{ startDate: "asc" }]
    });
  }
  /**
   * Obtener un periodo por ID
   */
  async getPeriodById(id) {
    return await prisma15.tax_calendar.findUnique({
      where: { id }
    });
  }
  /**
   * Crear un nuevo periodo en el calendario fiscal
   */
  async createPeriod(data) {
    return await prisma15.tax_calendar.create({
      data: {
        id: randomUUID6(),
        ...data,
        status: data.status || "PENDIENTE",
        active: true,
        locked: false,
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      }
    });
  }
  /**
   * Actualizar un periodo existente
   */
  async updatePeriod(id, data) {
    return await prisma15.tax_calendar.update({
      where: { id },
      data: {
        ...data,
        updatedAt: /* @__PURE__ */ new Date()
      }
    });
  }
  /**
   * Cambiar el estado de un periodo (PENDIENTE -> ABIERTO -> CERRADO)
   * Cuando se abre un periodo, se deben generar automáticamente las obligaciones
   */
  async updatePeriodStatus(id, status) {
    return await prisma15.tax_calendar.update({
      where: { id },
      data: {
        status,
        updatedAt: /* @__PURE__ */ new Date()
      }
    });
  }
  /**
   * Eliminar un periodo (soft delete - marca como inactivo)
   */
  async deletePeriod(id) {
    return await prisma15.tax_calendar.update({
      where: { id },
      data: {
        active: false,
        updatedAt: /* @__PURE__ */ new Date()
      }
    });
  }
  /**
   * Obtener periodos por año
   */
  async getPeriodsByYear(year) {
    return await prisma15.tax_calendar.findMany({
      where: { year },
      orderBy: [{ modelCode: "asc" }, { period: "asc" }]
    });
  }
  /**
   * Obtener periodos por modelo
   */
  async getPeriodsByModel(modelCode) {
    return await prisma15.tax_calendar.findMany({
      where: { modelCode },
      orderBy: [{ year: "desc" }, { period: "asc" }]
    });
  }
  /**
   * Verificar si existe un periodo
   */
  async periodExists(modelCode, period, year) {
    const existing = await prisma15.tax_calendar.findFirst({
      where: {
        modelCode,
        period,
        year
      }
    });
    return !!existing;
  }
};
var tax_calendar_service_default = new TaxCalendarService();

// server/routes/tax-calendar.routes.ts
var router10 = Router3();
router10.use(authenticateToken);
router10.get("/", async (req, res) => {
  try {
    const { year, modelCode, status } = req.query;
    const filters = {};
    if (year) filters.year = parseInt(year);
    if (modelCode) filters.modelCode = modelCode;
    if (status) filters.status = status;
    const periods = await tax_calendar_service_default.getAllPeriods(filters);
    res.json({
      success: true,
      data: periods,
      count: periods.length
    });
  } catch (error) {
    console.error("Error obteniendo periodos:", error);
    res.status(500).json({
      success: false,
      message: "Error obteniendo periodos del calendario fiscal",
      error: error.message
    });
  }
});
router10.get("/open", async (req, res) => {
  try {
    const { modelCode } = req.query;
    const openPeriods = await tax_calendar_service_default.getOpenPeriods(
      modelCode
    );
    res.json({
      success: true,
      data: openPeriods,
      count: openPeriods.length
    });
  } catch (error) {
    console.error("Error obteniendo periodos abiertos:", error);
    res.status(500).json({
      success: false,
      message: "Error obteniendo periodos abiertos",
      error: error.message
    });
  }
});
router10.get("/year/:year", async (req, res) => {
  try {
    const { year } = req.params;
    const periods = await tax_calendar_service_default.getPeriodsByYear(parseInt(year));
    res.json({
      success: true,
      data: periods,
      count: periods.length
    });
  } catch (error) {
    console.error("Error obteniendo periodos por a\xF1o:", error);
    res.status(500).json({
      success: false,
      message: "Error obteniendo periodos por a\xF1o",
      error: error.message
    });
  }
});
router10.get("/model/:modelCode", async (req, res) => {
  try {
    const { modelCode } = req.params;
    const periods = await tax_calendar_service_default.getPeriodsByModel(modelCode);
    res.json({
      success: true,
      data: periods,
      count: periods.length
    });
  } catch (error) {
    console.error("Error obteniendo periodos por modelo:", error);
    res.status(500).json({
      success: false,
      message: "Error obteniendo periodos por modelo",
      error: error.message
    });
  }
});
router10.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const period = await tax_calendar_service_default.getPeriodById(id);
    if (!period) {
      return res.status(404).json({
        success: false,
        message: "Periodo no encontrado"
      });
    }
    res.json({
      success: true,
      data: period
    });
  } catch (error) {
    console.error("Error obteniendo periodo:", error);
    res.status(500).json({
      success: false,
      message: "Error obteniendo periodo",
      error: error.message
    });
  }
});
router10.post("/", async (req, res) => {
  try {
    const { modelCode, period, year, startDate, endDate, status, days_to_start, days_to_end } = req.body;
    if (!modelCode || !period || !year || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Faltan campos obligatorios: modelCode, period, year, startDate, endDate"
      });
    }
    const exists = await tax_calendar_service_default.periodExists(modelCode, period, year);
    if (exists) {
      return res.status(409).json({
        success: false,
        message: `Ya existe un periodo ${period} del modelo ${modelCode} para el a\xF1o ${year}`
      });
    }
    const newPeriod = await tax_calendar_service_default.createPeriod({
      modelCode,
      period,
      year: parseInt(year),
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      status,
      days_to_start,
      days_to_end
    });
    res.status(201).json({
      success: true,
      message: "Periodo creado exitosamente",
      data: newPeriod
    });
  } catch (error) {
    console.error("Error creando periodo:", error);
    res.status(500).json({
      success: false,
      message: "Error creando periodo",
      error: error.message
    });
  }
});
router10.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    if (data.startDate) data.startDate = new Date(data.startDate);
    if (data.endDate) data.endDate = new Date(data.endDate);
    const updatedPeriod = await tax_calendar_service_default.updatePeriod(id, data);
    res.json({
      success: true,
      message: "Periodo actualizado exitosamente",
      data: updatedPeriod
    });
  } catch (error) {
    console.error("Error actualizando periodo:", error);
    res.status(500).json({
      success: false,
      message: "Error actualizando periodo",
      error: error.message
    });
  }
});
router10.put("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!["PENDIENTE", "ABIERTO", "CERRADO"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Estado inv\xE1lido. Debe ser PENDIENTE, ABIERTO o CERRADO"
      });
    }
    const updatedPeriod = await tax_calendar_service_default.updatePeriodStatus(id, status);
    res.json({
      success: true,
      message: `Periodo actualizado a ${status}`,
      data: updatedPeriod
    });
  } catch (error) {
    console.error("Error actualizando estado del periodo:", error);
    res.status(500).json({
      success: false,
      message: "Error actualizando estado del periodo",
      error: error.message
    });
  }
});
router10.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await tax_calendar_service_default.deletePeriod(id);
    res.json({
      success: true,
      message: "Periodo eliminado exitosamente"
    });
  } catch (error) {
    console.error("Error eliminando periodo:", error);
    res.status(500).json({
      success: false,
      message: "Error eliminando periodo",
      error: error.message
    });
  }
});
var tax_calendar_routes_default = router10;

// server/routes/client-tax.routes.ts
import { Router as Router4 } from "express";

// server/services/client-tax.service.ts
import { PrismaClient as PrismaClient16 } from "@prisma/client";
var prisma16 = new PrismaClient16();
var ClientTaxService = class {
  /**
   * Obtener todos los modelos fiscales de un cliente
   */
  async getClientTaxModels(clientId) {
    return await prisma16.client_tax_models.findMany({
      where: { client_id: clientId },
      orderBy: { model_number: "asc" }
    });
  }
  /**
   * Obtener modelos activos de un cliente
   */
  async getActiveClientTaxModels(clientId) {
    return await prisma16.client_tax_models.findMany({
      where: {
        client_id: clientId,
        is_active: true,
        OR: [
          { end_date: null },
          // Sin fecha de fin (indefinido)
          { end_date: { gte: /* @__PURE__ */ new Date() } }
          // Fecha de fin mayor o igual a hoy
        ]
      },
      orderBy: { model_number: "asc" }
    });
  }
  /**
   * Obtener un modelo fiscal específico de un cliente
   */
  async getClientTaxModel(id) {
    return await prisma16.client_tax_models.findUnique({
      where: { id },
      include: {
        clients: {
          select: {
            id: true,
            razonSocial: true,
            nifCif: true
          }
        }
      }
    });
  }
  /**
   * Dar de alta un modelo fiscal para un cliente
   * IMPORTANTE: Al dar de alta un modelo, genera automáticamente obligaciones
   * para todos los periodos ABIERTOS de ese modelo
   */
  async createClientTaxModel(data) {
    const existing = await prisma16.client_tax_models.findFirst({
      where: {
        client_id: data.client_id,
        model_number: data.model_number
      }
    });
    if (existing) {
      throw new Error(
        `El modelo ${data.model_number} ya est\xE1 dado de alta para este cliente`
      );
    }
    const newModel = await prisma16.client_tax_models.create({
      data: {
        ...data,
        is_active: true,
        created_at: /* @__PURE__ */ new Date(),
        updated_at: /* @__PURE__ */ new Date()
      }
    });
    const openPeriods = await prisma16.tax_calendar.findMany({
      where: {
        modelCode: data.model_number,
        status: "ABIERTO",
        active: true
      }
    });
    for (const period of openPeriods) {
      const existingObligation = await prisma16.client_tax_obligations.findFirst({
        where: {
          client_id: data.client_id,
          tax_calendar_id: period.id
        }
      });
      if (!existingObligation) {
        await prisma16.client_tax_obligations.create({
          data: {
            client_id: data.client_id,
            tax_calendar_id: period.id,
            model_number: period.modelCode,
            period: period.period,
            year: period.year,
            due_date: period.endDate,
            status: "PENDING",
            created_at: /* @__PURE__ */ new Date(),
            updated_at: /* @__PURE__ */ new Date()
          }
        });
      }
    }
    return newModel;
  }
  /**
   * Actualizar un modelo fiscal de un cliente
   */
  async updateClientTaxModel(id, data) {
    return await prisma16.client_tax_models.update({
      where: { id },
      data: {
        ...data,
        updated_at: /* @__PURE__ */ new Date()
      }
    });
  }
  /**
   * Activar/Desactivar un modelo fiscal
   * IMPORTANTE: Al activar un modelo, genera automáticamente obligaciones
   * para todos los periodos ABIERTOS de ese modelo
   */
  async toggleClientTaxModel(id, is_active) {
    const model = await prisma16.client_tax_models.findUnique({
      where: { id }
    });
    if (!model) {
      throw new Error("Modelo fiscal no encontrado");
    }
    const updatedModel = await prisma16.client_tax_models.update({
      where: { id },
      data: {
        is_active,
        updated_at: /* @__PURE__ */ new Date()
      }
    });
    if (is_active && !model.is_active) {
      const openPeriods = await prisma16.tax_calendar.findMany({
        where: {
          modelCode: model.model_number,
          status: "ABIERTO",
          active: true
        }
      });
      for (const period of openPeriods) {
        const existingObligation = await prisma16.client_tax_obligations.findFirst({
          where: {
            client_id: model.client_id,
            tax_calendar_id: period.id
          }
        });
        if (!existingObligation) {
          await prisma16.client_tax_obligations.create({
            data: {
              client_id: model.client_id,
              tax_calendar_id: period.id,
              model_number: period.modelCode,
              period: period.period,
              year: period.year,
              due_date: period.endDate,
              status: "PENDING",
              created_at: /* @__PURE__ */ new Date(),
              updated_at: /* @__PURE__ */ new Date()
            }
          });
        }
      }
    }
    return updatedModel;
  }
  /**
   * Eliminar un modelo fiscal de un cliente
   */
  async deleteClientTaxModel(id) {
    return await prisma16.client_tax_models.delete({
      where: { id }
    });
  }
  /**
   * Obtener todos los clientes que tienen un modelo específico activo
   * Esta función es crucial para la generación automática de obligaciones
   */
  async getClientsWithActiveModel(modelNumber) {
    const now = /* @__PURE__ */ new Date();
    return await prisma16.client_tax_models.findMany({
      where: {
        model_number: modelNumber,
        is_active: true,
        start_date: { lte: now },
        // Ya ha empezado
        OR: [
          { end_date: null },
          // Sin fecha de fin
          { end_date: { gte: now } }
          // Aún no ha terminado
        ]
      },
      include: {
        clients: {
          select: {
            id: true,
            razonSocial: true,
            nifCif: true,
            email: true,
            responsableAsignado: true,
            tipo: true
          }
        }
      }
    });
  }
  /**
   * Verificar si un cliente tiene un modelo activo
   */
  async clientHasActiveModel(clientId, modelNumber) {
    const now = /* @__PURE__ */ new Date();
    const model = await prisma16.client_tax_models.findFirst({
      where: {
        client_id: clientId,
        model_number: modelNumber,
        is_active: true,
        start_date: { lte: now },
        OR: [{ end_date: null }, { end_date: { gte: now } }]
      }
    });
    return !!model;
  }
  /**
   * Obtener estadísticas de modelos por cliente
   */
  async getClientTaxStats(clientId) {
    const total = await prisma16.client_tax_models.count({
      where: { client_id: clientId }
    });
    const active = await prisma16.client_tax_models.count({
      where: {
        client_id: clientId,
        is_active: true
      }
    });
    const models = await prisma16.client_tax_models.findMany({
      where: { client_id: clientId },
      select: { model_number: true, period_type: true, is_active: true }
    });
    return {
      total,
      active,
      inactive: total - active,
      models
    };
  }
};
var client_tax_service_default = new ClientTaxService();

// server/routes/client-tax.routes.ts
var router11 = Router4();
router11.use(authenticateToken);
router11.get("/:clientId/tax-models", async (req, res) => {
  try {
    const { clientId } = req.params;
    const { activeOnly } = req.query;
    let models;
    if (activeOnly === "true") {
      models = await client_tax_service_default.getActiveClientTaxModels(clientId);
    } else {
      models = await client_tax_service_default.getClientTaxModels(clientId);
    }
    res.json({
      success: true,
      data: models,
      count: models.length
    });
  } catch (error) {
    console.error("Error obteniendo modelos del cliente:", error);
    res.status(500).json({
      success: false,
      message: "Error obteniendo modelos fiscales del cliente",
      error: error.message
    });
  }
});
router11.get("/:clientId/tax-models/stats", async (req, res) => {
  try {
    const { clientId } = req.params;
    const stats = await client_tax_service_default.getClientTaxStats(clientId);
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error("Error obteniendo estad\xEDsticas:", error);
    res.status(500).json({
      success: false,
      message: "Error obteniendo estad\xEDsticas",
      error: error.message
    });
  }
});
router11.get("/tax-models/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const model = await client_tax_service_default.getClientTaxModel(id);
    if (!model) {
      return res.status(404).json({
        success: false,
        message: "Modelo fiscal no encontrado"
      });
    }
    res.json({
      success: true,
      data: model
    });
  } catch (error) {
    console.error("Error obteniendo modelo fiscal:", error);
    res.status(500).json({
      success: false,
      message: "Error obteniendo modelo fiscal",
      error: error.message
    });
  }
});
router11.post("/:clientId/tax-models", async (req, res) => {
  try {
    const { clientId } = req.params;
    const { model_number, period_type, start_date, end_date, notes } = req.body;
    if (!model_number || !period_type || !start_date) {
      return res.status(400).json({
        success: false,
        message: "Faltan campos obligatorios: model_number, period_type, start_date"
      });
    }
    if (!["MONTHLY", "QUARTERLY", "ANNUAL"].includes(period_type)) {
      return res.status(400).json({
        success: false,
        message: "period_type debe ser MONTHLY, QUARTERLY o ANNUAL"
      });
    }
    const newModel = await client_tax_service_default.createClientTaxModel({
      client_id: clientId,
      model_number,
      period_type,
      start_date: new Date(start_date),
      end_date: end_date ? new Date(end_date) : void 0,
      notes
    });
    res.status(201).json({
      success: true,
      message: "Modelo fiscal dado de alta exitosamente",
      data: newModel
    });
  } catch (error) {
    console.error("Error creando modelo fiscal:", error);
    if (error.message.includes("ya est\xE1 dado de alta")) {
      return res.status(409).json({
        success: false,
        message: error.message
      });
    }
    res.status(500).json({
      success: false,
      message: "Error dando de alta modelo fiscal",
      error: error.message
    });
  }
});
router11.put("/tax-models/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    if (data.start_date) data.start_date = new Date(data.start_date);
    if (data.end_date) data.end_date = new Date(data.end_date);
    const updatedModel = await client_tax_service_default.updateClientTaxModel(id, data);
    res.json({
      success: true,
      message: "Modelo fiscal actualizado exitosamente",
      data: updatedModel
    });
  } catch (error) {
    console.error("Error actualizando modelo fiscal:", error);
    res.status(500).json({
      success: false,
      message: "Error actualizando modelo fiscal",
      error: error.message
    });
  }
});
router11.put("/tax-models/:id/toggle", async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;
    if (typeof is_active !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "El campo is_active debe ser booleano"
      });
    }
    const updatedModel = await client_tax_service_default.toggleClientTaxModel(id, is_active);
    res.json({
      success: true,
      message: `Modelo fiscal ${is_active ? "activado" : "desactivado"} exitosamente`,
      data: updatedModel
    });
  } catch (error) {
    console.error("Error cambiando estado del modelo:", error);
    res.status(500).json({
      success: false,
      message: "Error cambiando estado del modelo",
      error: error.message
    });
  }
});
router11.delete("/tax-models/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await client_tax_service_default.deleteClientTaxModel(id);
    res.json({
      success: true,
      message: "Modelo fiscal eliminado exitosamente"
    });
  } catch (error) {
    console.error("Error eliminando modelo fiscal:", error);
    res.status(500).json({
      success: false,
      message: "Error eliminando modelo fiscal",
      error: error.message
    });
  }
});
router11.get("/tax-models/by-model/:modelNumber", async (req, res) => {
  try {
    const { modelNumber } = req.params;
    const clientsWithModel = await client_tax_service_default.getClientsWithActiveModel(modelNumber);
    res.json({
      success: true,
      data: clientsWithModel,
      count: clientsWithModel.length
    });
  } catch (error) {
    console.error("Error obteniendo clientes con modelo:", error);
    res.status(500).json({
      success: false,
      message: "Error obteniendo clientes con modelo activo",
      error: error.message
    });
  }
});
var client_tax_routes_default = router11;

// server/routes/tax-obligations.routes.ts
import { Router as Router5 } from "express";

// server/services/tax-obligations.service.ts
import { PrismaClient as PrismaClient17 } from "@prisma/client";
var prisma17 = new PrismaClient17();
var TaxObligationsService = class {
  /**
   * FUNCIÓN PRINCIPAL: Generar obligaciones automáticamente
   * 
   * Esta función:
   * 1. Obtiene todos los periodos ABIERTOS del calendario AEAT
   * 2. Para cada periodo, busca los clientes que tengan ese modelo activo
   * 3. Crea obligaciones automáticamente si no existen
   */
  async generateAutomaticObligations() {
    try {
      const openPeriods = await tax_calendar_service_default.getOpenPeriods();
      if (openPeriods.length === 0) {
        return {
          success: true,
          message: "No hay periodos abiertos en el calendario AEAT",
          generated: 0
        };
      }
      let totalGenerated = 0;
      const details = [];
      for (const period of openPeriods) {
        const result = await this.generateObligationsForPeriod(period.id);
        totalGenerated += result.generated;
        details.push({
          period: `${period.modelCode} - ${period.period} ${period.year}`,
          generated: result.generated,
          skipped: result.skipped
        });
      }
      return {
        success: true,
        message: `Generadas ${totalGenerated} obligaciones autom\xE1ticamente`,
        generated: totalGenerated,
        details
      };
    } catch (error) {
      console.error("Error generando obligaciones autom\xE1ticas:", error);
      throw new Error(`Error generando obligaciones: ${error.message}`);
    }
  }
  /**
   * Generar obligaciones para un periodo específico
   */
  async generateObligationsForPeriod(taxCalendarId) {
    const period = await tax_calendar_service_default.getPeriodById(taxCalendarId);
    if (!period) {
      throw new Error("Periodo no encontrado");
    }
    const today2 = /* @__PURE__ */ new Date();
    if (period.startDate > today2 || period.endDate < today2) {
      return {
        generated: 0,
        skipped: 0,
        message: "El periodo no est\xE1 abierto (fuera del rango de fechas)"
      };
    }
    const taxModel = await prisma17.tax_models_config.findFirst({
      where: { code: period.modelCode }
    });
    if (!taxModel) {
      throw new Error(`Modelo ${period.modelCode} no encontrado en tax_models_config`);
    }
    const clientsWithModel = await client_tax_service_default.getClientsWithActiveModel(
      period.modelCode
    );
    let generated = 0;
    let skipped = 0;
    for (const clientTaxModel of clientsWithModel) {
      const client = clientTaxModel.clients;
      let allowedCategories = [];
      try {
        allowedCategories = JSON.parse(taxModel.allowedTypes);
      } catch (e) {
        console.error("Error parsing allowedTypes:", e);
      }
      if (client.tipo && allowedCategories.length > 0 && !allowedCategories.includes(client.tipo)) {
        skipped++;
        continue;
      }
      if (clientTaxModel.period_type && period.periodType && clientTaxModel.period_type !== period.periodType) {
        skipped++;
        continue;
      }
      const existingObligation = await prisma17.client_tax_obligations.findFirst({
        where: {
          client_id: client.id,
          tax_calendar_id: period.id
        }
      });
      if (existingObligation) {
        skipped++;
        continue;
      }
      await prisma17.client_tax_obligations.create({
        data: {
          client_id: client.id,
          tax_calendar_id: period.id,
          model_number: period.modelCode,
          period: period.period,
          year: period.year,
          due_date: period.endDate,
          status: "PENDING",
          created_at: /* @__PURE__ */ new Date(),
          updated_at: /* @__PURE__ */ new Date()
        }
      });
      generated++;
    }
    return {
      generated,
      skipped,
      message: `Generadas ${generated} obligaciones, ${skipped} ya exist\xEDan o no cumplieron validaciones`
    };
  }
  /**
   * Generar obligaciones para un cliente específico
   * Busca todos los modelos activos del cliente y genera obligaciones
   * para los periodos ABIERTOS de esos modelos
   */
  async generateObligationsForClient(clientId) {
    try {
      const clientModels = await client_tax_service_default.getActiveClientTaxModels(clientId);
      if (clientModels.length === 0) {
        return {
          success: true,
          message: "El cliente no tiene modelos fiscales activos",
          generated: 0
        };
      }
      let totalGenerated = 0;
      const details = [];
      for (const model of clientModels) {
        const today2 = /* @__PURE__ */ new Date();
        const openPeriods = await prisma17.tax_calendar.findMany({
          where: {
            modelCode: model.model_number,
            startDate: { lte: today2 },
            endDate: { gte: today2 },
            active: true
          }
        });
        let generatedForModel = 0;
        for (const period of openPeriods) {
          const existingObligation = await prisma17.client_tax_obligations.findFirst({
            where: {
              client_id: clientId,
              tax_calendar_id: period.id
            }
          });
          if (!existingObligation) {
            await prisma17.client_tax_obligations.create({
              data: {
                client_id: clientId,
                tax_calendar_id: period.id,
                model_number: period.modelCode,
                period: period.period,
                year: period.year,
                due_date: period.endDate,
                status: "PENDING",
                created_at: /* @__PURE__ */ new Date(),
                updated_at: /* @__PURE__ */ new Date()
              }
            });
            generatedForModel++;
            totalGenerated++;
          }
        }
        if (generatedForModel > 0) {
          details.push({
            model: model.model_number,
            generated: generatedForModel
          });
        }
      }
      return {
        success: true,
        message: `Generadas ${totalGenerated} obligaciones para el cliente`,
        generated: totalGenerated,
        details
      };
    } catch (error) {
      console.error("Error generando obligaciones del cliente:", error);
      throw new Error(`Error generando obligaciones del cliente: ${error.message}`);
    }
  }
  /**
   * Obtener todas las obligaciones con filtros
   */
  async getObligations(filters) {
    const where = {};
    if (filters?.clientId) where.client_id = filters.clientId;
    if (filters?.status) where.status = filters.status;
    if (filters?.modelNumber) where.model_number = filters.modelNumber;
    if (filters?.year) where.year = filters.year;
    if (filters?.dueDateFrom || filters?.dueDateTo) {
      where.due_date = {};
      if (filters.dueDateFrom) where.due_date.gte = filters.dueDateFrom;
      if (filters.dueDateTo) where.due_date.lte = filters.dueDateTo;
    }
    return await prisma17.client_tax_obligations.findMany({
      where,
      include: {
        clients: {
          select: {
            id: true,
            razonSocial: true,
            nifCif: true
          }
        },
        tax_calendar: {
          select: {
            id: true,
            modelCode: true,
            period: true,
            year: true,
            startDate: true,
            endDate: true,
            status: true
          }
        },
        completed_by_user: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      },
      orderBy: [{ due_date: "asc" }, { model_number: "asc" }]
    });
  }
  /**
   * Obtener obligaciones de periodos ABIERTOS
   * Esta es la función clave para mostrar las tarjetas automáticamente
   */
  async getObligationsFromOpenPeriods(clientId) {
    const today2 = /* @__PURE__ */ new Date();
    const where = {
      tax_calendar: {
        startDate: { lte: today2 },
        endDate: { gte: today2 },
        active: true
      }
    };
    if (clientId) {
      where.client_id = clientId;
    }
    const obligations = await prisma17.client_tax_obligations.findMany({
      where,
      include: {
        clients: {
          select: {
            id: true,
            razonSocial: true,
            nifCif: true,
            tipo: true
          }
        },
        tax_calendar: {
          select: {
            id: true,
            modelCode: true,
            period: true,
            year: true,
            startDate: true,
            endDate: true,
            status: true
          }
        }
      },
      orderBy: [{ due_date: "asc" }]
    });
    return obligations.map((obligation) => {
      const daysUntilStart = Math.ceil(
        (obligation.tax_calendar.startDate.getTime() - today2.getTime()) / (1e3 * 60 * 60 * 24)
      );
      const daysUntilEnd = Math.ceil(
        (obligation.tax_calendar.endDate.getTime() - today2.getTime()) / (1e3 * 60 * 60 * 24)
      );
      let statusMessage = "";
      if (daysUntilStart > 0) {
        statusMessage = `Empieza en ${daysUntilStart} d\xEDa${daysUntilStart !== 1 ? "s" : ""}`;
      } else if (daysUntilEnd > 0) {
        statusMessage = `Finaliza en ${daysUntilEnd} d\xEDa${daysUntilEnd !== 1 ? "s" : ""}`;
      } else {
        statusMessage = "Finaliza hoy";
      }
      return {
        ...obligation,
        daysUntilStart,
        daysUntilEnd,
        statusMessage
      };
    });
  }
  /**
   * Obtener una obligación por ID
   */
  async getObligationById(id) {
    return await prisma17.client_tax_obligations.findUnique({
      where: { id },
      include: {
        clients: true,
        tax_calendar: true,
        completed_by_user: true
      }
    });
  }
  /**
   * Actualizar una obligación
   */
  async updateObligation(id, data) {
    return await prisma17.client_tax_obligations.update({
      where: { id },
      data: {
        ...data,
        updated_at: /* @__PURE__ */ new Date()
      }
    });
  }
  /**
   * Marcar una obligación como completada
   */
  async completeObligation(id, userId, amount) {
    return await prisma17.client_tax_obligations.update({
      where: { id },
      data: {
        status: "COMPLETED",
        completed_at: /* @__PURE__ */ new Date(),
        completed_by: userId,
        amount: amount || void 0,
        updated_at: /* @__PURE__ */ new Date()
      }
    });
  }
  /**
   * Marcar obligaciones como vencidas (OVERDUE)
   * Esta función debe ejecutarse diariamente por un cron job
   */
  async markOverdueObligations() {
    const now = /* @__PURE__ */ new Date();
    const result = await prisma17.client_tax_obligations.updateMany({
      where: {
        status: "PENDING",
        due_date: { lt: now }
      },
      data: {
        status: "OVERDUE",
        updated_at: now
      }
    });
    return {
      success: true,
      updated: result.count,
      message: `${result.count} obligaciones marcadas como vencidas`
    };
  }
  /**
   * Obtener estadísticas de obligaciones
   */
  async getObligationStats(clientId) {
    const where = clientId ? { client_id: clientId } : {};
    const [total, pending, inProgress, completed, overdue] = await Promise.all([
      prisma17.client_tax_obligations.count({ where }),
      prisma17.client_tax_obligations.count({
        where: { ...where, status: "PENDING" }
      }),
      prisma17.client_tax_obligations.count({
        where: { ...where, status: "IN_PROGRESS" }
      }),
      prisma17.client_tax_obligations.count({
        where: { ...where, status: "COMPLETED" }
      }),
      prisma17.client_tax_obligations.count({
        where: { ...where, status: "OVERDUE" }
      })
    ]);
    return {
      total,
      pending,
      inProgress,
      completed,
      overdue
    };
  }
  /**
   * Eliminar una obligación
   */
  async deleteObligation(id) {
    return await prisma17.client_tax_obligations.delete({
      where: { id }
    });
  }
};
var tax_obligations_service_default = new TaxObligationsService();

// server/routes/tax-obligations.routes.ts
var router12 = Router5();
router12.use(authenticateToken);
router12.get("/", async (req, res) => {
  try {
    const { clientId, status, modelNumber, year, dueDateFrom, dueDateTo } = req.query;
    const filters = {};
    if (clientId) filters.clientId = clientId;
    if (status) filters.status = status;
    if (modelNumber) filters.modelNumber = modelNumber;
    if (year) filters.year = parseInt(year);
    if (dueDateFrom) filters.dueDateFrom = new Date(dueDateFrom);
    if (dueDateTo) filters.dueDateTo = new Date(dueDateTo);
    const obligations = await tax_obligations_service_default.getObligations(filters);
    res.json({
      success: true,
      data: obligations,
      count: obligations.length
    });
  } catch (error) {
    console.error("Error obteniendo obligaciones:", error);
    res.status(500).json({
      success: false,
      message: "Error obteniendo obligaciones fiscales",
      error: error.message
    });
  }
});
router12.get("/open-periods", async (req, res) => {
  try {
    const { clientId } = req.query;
    const obligations = await tax_obligations_service_default.getObligationsFromOpenPeriods(
      clientId
    );
    res.json({
      success: true,
      data: obligations,
      count: obligations.length,
      message: "Obligaciones de periodos abiertos"
    });
  } catch (error) {
    console.error("Error obteniendo obligaciones de periodos abiertos:", error);
    res.status(500).json({
      success: false,
      message: "Error obteniendo obligaciones de periodos abiertos",
      error: error.message
    });
  }
});
router12.get("/stats", async (req, res) => {
  try {
    const { clientId } = req.query;
    const stats = await tax_obligations_service_default.getObligationStats(
      clientId
    );
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error("Error obteniendo estad\xEDsticas:", error);
    res.status(500).json({
      success: false,
      message: "Error obteniendo estad\xEDsticas",
      error: error.message
    });
  }
});
router12.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const obligation = await tax_obligations_service_default.getObligationById(id);
    if (!obligation) {
      return res.status(404).json({
        success: false,
        message: "Obligaci\xF3n no encontrada"
      });
    }
    res.json({
      success: true,
      data: obligation
    });
  } catch (error) {
    console.error("Error obteniendo obligaci\xF3n:", error);
    res.status(500).json({
      success: false,
      message: "Error obteniendo obligaci\xF3n",
      error: error.message
    });
  }
});
router12.post("/generate-auto", async (req, res) => {
  try {
    const result = await tax_obligations_service_default.generateAutomaticObligations();
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error("Error generando obligaciones autom\xE1ticas:", error);
    res.status(500).json({
      success: false,
      message: "Error generando obligaciones autom\xE1ticas",
      error: error.message
    });
  }
});
router12.post("/generate-period/:taxCalendarId", async (req, res) => {
  try {
    const { taxCalendarId } = req.params;
    const result = await tax_obligations_service_default.generateObligationsForPeriod(taxCalendarId);
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error("Error generando obligaciones del periodo:", error);
    res.status(500).json({
      success: false,
      message: "Error generando obligaciones del periodo",
      error: error.message
    });
  }
});
router12.post("/generate-client/:clientId", async (req, res) => {
  try {
    const { clientId } = req.params;
    const result = await tax_obligations_service_default.generateObligationsForClient(clientId);
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error("Error generando obligaciones del cliente:", error);
    res.status(500).json({
      success: false,
      message: "Error generando obligaciones del cliente",
      error: error.message
    });
  }
});
router12.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, amount, notes } = req.body;
    const updatedObligation = await tax_obligations_service_default.updateObligation(id, {
      status,
      amount: amount ? parseFloat(amount) : void 0,
      notes
    });
    res.json({
      success: true,
      message: "Obligaci\xF3n actualizada exitosamente",
      data: updatedObligation
    });
  } catch (error) {
    console.error("Error actualizando obligaci\xF3n:", error);
    res.status(500).json({
      success: false,
      message: "Error actualizando obligaci\xF3n",
      error: error.message
    });
  }
});
router12.put("/:id/complete", async (req, res) => {
  try {
    const { id } = req.params;
    const { amount } = req.body;
    const userId = req.user.id;
    const completedObligation = await tax_obligations_service_default.completeObligation(
      id,
      userId,
      amount ? parseFloat(amount) : void 0
    );
    res.json({
      success: true,
      message: "Obligaci\xF3n marcada como completada",
      data: completedObligation
    });
  } catch (error) {
    console.error("Error completando obligaci\xF3n:", error);
    res.status(500).json({
      success: false,
      message: "Error completando obligaci\xF3n",
      error: error.message
    });
  }
});
router12.post("/mark-overdue", async (req, res) => {
  try {
    const result = await tax_obligations_service_default.markOverdueObligations();
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error("Error marcando obligaciones vencidas:", error);
    res.status(500).json({
      success: false,
      message: "Error marcando obligaciones vencidas",
      error: error.message
    });
  }
});
router12.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await tax_obligations_service_default.deleteObligation(id);
    res.json({
      success: true,
      message: "Obligaci\xF3n eliminada exitosamente"
    });
  } catch (error) {
    console.error("Error eliminando obligaci\xF3n:", error);
    res.status(500).json({
      success: false,
      message: "Error eliminando obligaci\xF3n",
      error: error.message
    });
  }
});
var tax_obligations_routes_default = router12;

// server/services/version-service.ts
import { readFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = dirname(__filename);
async function getCurrentVersion() {
  try {
    const packageJsonPath = join(__dirname, "../../package.json");
    const packageJson = await readFile(packageJsonPath, "utf-8");
    const pkg = JSON.parse(packageJson);
    return pkg.version || "1.0.0";
  } catch (error) {
    console.error("Error al leer package.json:", error);
    return "1.0.0";
  }
}
async function getLatestGitHubVersion(owner, repo) {
  try {
    const url = `https://api.github.com/repos/${owner}/${repo}/releases/latest`;
    const response = await fetch(url, {
      headers: {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "Asesoria-La-Llave-App"
      }
    });
    if (!response.ok) {
      if (response.status === 404) {
        console.log("No se encontraron releases en GitHub");
        return null;
      }
      throw new Error(`GitHub API error: ${response.status}`);
    }
    const release = await response.json();
    if (release.draft || release.prerelease) {
      return null;
    }
    return release;
  } catch (error) {
    console.error("Error al consultar GitHub:", error);
    return null;
  }
}
function compareVersions(v1, v2) {
  const parts1 = v1.replace(/^v/, "").split(".").map(Number);
  const parts2 = v2.replace(/^v/, "").split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
}
async function checkForUpdates2(owner, repo) {
  const currentVersion = await getCurrentVersion();
  const latestRelease = await getLatestGitHubVersion(owner, repo);
  if (!latestRelease) {
    return {
      current: currentVersion,
      latest: null,
      updateAvailable: false
    };
  }
  const latestVersion = latestRelease.tag_name.replace(/^v/, "");
  const updateAvailable = compareVersions(latestVersion, currentVersion) > 0;
  return {
    current: currentVersion,
    latest: latestVersion,
    updateAvailable,
    releaseNotes: latestRelease.body,
    publishedAt: latestRelease.published_at
  };
}

// server/services/backup-service-wrapper.ts
var createSystemBackup = async (...args) => {
  throw new Error("Backup service not implemented yet");
};
var listBackups = async (...args) => {
  return [];
};
var restoreFromBackup = async (...args) => {
  throw new Error("Restore service not implemented yet");
};

// server/services/update-service-wrapper.ts
var performSystemUpdate = async (...args) => {
  throw new Error("System update service not implemented yet");
};
var verifyGitSetup = async (...args) => {
  return { isValid: false, message: "Git setup verification not implemented yet" };
};
var getUpdateHistory = async (...args) => {
  return [];
};

// server/services/storage-factory.ts
import { PrismaClient as PrismaClient18 } from "@prisma/client";

// server/services/storage-provider.ts
import fs7 from "fs/promises";
import path7 from "path";
var LocalStorageProvider = class {
  constructor(basePath = path7.join(process.cwd(), "uploads")) {
    this.basePath = basePath;
  }
  async upload(file, relativePath) {
    const fullPath = path7.join(this.basePath, relativePath);
    const dir = path7.dirname(fullPath);
    await fs7.mkdir(dir, { recursive: true });
    if (Buffer.isBuffer(file)) {
      await fs7.writeFile(fullPath, file);
    } else {
      const writeStream = (await import("fs")).createWriteStream(fullPath);
      await new Promise((resolve, reject) => {
        file.pipe(writeStream);
        file.on("end", resolve);
        file.on("error", reject);
        writeStream.on("error", reject);
      });
    }
    return relativePath;
  }
  async download(relativePath) {
    const fullPath = path7.join(this.basePath, relativePath);
    return await fs7.readFile(fullPath);
  }
  async delete(relativePath) {
    const fullPath = path7.join(this.basePath, relativePath);
    await fs7.unlink(fullPath);
  }
  async list(relativePath = "", recursive = false) {
    const fullPath = path7.join(this.basePath, relativePath);
    const files = [];
    try {
      const entries = await fs7.readdir(fullPath, { withFileTypes: true });
      for (const entry of entries) {
        const entryPath = path7.join(relativePath, entry.name);
        if (entry.isFile()) {
          files.push(entryPath);
        } else if (entry.isDirectory() && recursive) {
          const subFiles = await this.list(entryPath, true);
          files.push(...subFiles);
        }
      }
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }
    return files;
  }
  async exists(relativePath) {
    const fullPath = path7.join(this.basePath, relativePath);
    try {
      await fs7.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }
  getPublicUrl(relativePath) {
    return `/uploads/${relativePath}`;
  }
};

// server/services/ftp-storage-provider.ts
import { Client as FTPClient } from "basic-ftp";
import { Readable } from "stream";
import path8 from "path";
var FTPStorageProvider = class {
  constructor(config) {
    this.client = null;
    this.isConnected = false;
    this.connectionPromise = null;
    this.config = {
      ...config,
      basePath: config.basePath || "/uploads",
      secure: config.secure || false
    };
  }
  async ensureConnection() {
    if (this.isConnected && this.client) {
      return;
    }
    if (this.connectionPromise) {
      return this.connectionPromise;
    }
    this.connectionPromise = (async () => {
      try {
        this.client = new FTPClient();
        this.client.ftp.verbose = false;
        await this.client.access({
          host: this.config.host,
          port: this.config.port,
          user: this.config.user,
          password: this.config.password,
          secure: this.config.secure
        });
        this.isConnected = true;
      } catch (error) {
        this.client = null;
        this.isConnected = false;
        throw new Error(`Error al conectar con FTP: ${error instanceof Error ? error.message : "Error desconocido"}`);
      } finally {
        this.connectionPromise = null;
      }
    })();
    return this.connectionPromise;
  }
  async upload(file, relativePath) {
    await this.ensureConnection();
    if (!this.client) throw new Error("Cliente FTP no conectado");
    const fullPath = path8.posix.join(this.config.basePath, relativePath);
    const dir = path8.posix.dirname(fullPath);
    await this.client.ensureDir(dir);
    if (Buffer.isBuffer(file)) {
      try {
        const stream = Readable.from(file);
        await this.client.uploadFrom(stream, fullPath);
      } catch (error) {
        this.isConnected = false;
        await this.ensureConnection();
        const stream = Readable.from(file);
        await this.client.uploadFrom(stream, fullPath);
      }
    } else {
      await this.client.uploadFrom(file, fullPath);
    }
    return relativePath;
  }
  async download(relativePath) {
    await this.ensureConnection();
    if (!this.client) throw new Error("Cliente FTP no conectado");
    const fullPath = path8.posix.join(this.config.basePath, relativePath);
    const chunks = [];
    try {
      const writableStream = new (__require("stream")).Writable({
        write(chunk, encoding, callback) {
          chunks.push(chunk);
          callback();
        }
      });
      await this.client.downloadTo(writableStream, fullPath);
      return Buffer.concat(chunks);
    } catch (error) {
      this.isConnected = false;
      await this.ensureConnection();
      const writableStream = new (__require("stream")).Writable({
        write(chunk, encoding, callback) {
          chunks.push(chunk);
          callback();
        }
      });
      await this.client.downloadTo(writableStream, fullPath);
      return Buffer.concat(chunks);
    }
  }
  async delete(relativePath) {
    await this.ensureConnection();
    if (!this.client) throw new Error("Cliente FTP no conectado");
    const fullPath = path8.posix.join(this.config.basePath, relativePath);
    try {
      await this.client.remove(fullPath);
    } catch (error) {
      this.isConnected = false;
      await this.ensureConnection();
      await this.client.remove(fullPath);
    }
  }
  async list(relativePath = "", recursive = false) {
    await this.ensureConnection();
    if (!this.client) throw new Error("Cliente FTP no conectado");
    const fullPath = path8.posix.join(this.config.basePath, relativePath);
    const files = [];
    try {
      if (recursive) {
        await this.listRecursive(fullPath, relativePath, files);
      } else {
        const items = await this.client.list(fullPath);
        for (const item of items) {
          if (item.type === 1) {
            const filePath = path8.posix.join(relativePath, item.name);
            files.push(filePath);
          }
        }
      }
      return files;
    } catch (error) {
      if (error.code === 550) {
        return [];
      }
      this.isConnected = false;
      await this.ensureConnection();
      return this.list(relativePath, recursive);
    }
  }
  async listRecursive(fullPath, relativePath, files) {
    if (!this.client) return;
    const items = await this.client.list(fullPath);
    for (const item of items) {
      const itemRelativePath = path8.posix.join(relativePath, item.name);
      const itemFullPath = path8.posix.join(fullPath, item.name);
      if (item.type === 1) {
        files.push(itemRelativePath);
      } else if (item.type === 2) {
        await this.listRecursive(itemFullPath, itemRelativePath, files);
      }
    }
  }
  async exists(relativePath) {
    await this.ensureConnection();
    if (!this.client) throw new Error("Cliente FTP no conectado");
    const fullPath = path8.posix.join(this.config.basePath, relativePath);
    const dir = path8.posix.dirname(fullPath);
    const filename = path8.posix.basename(fullPath);
    try {
      const items = await this.client.list(dir);
      return items.some((item) => item.name === filename);
    } catch (error) {
      if (error.code === 550) {
        return false;
      }
      this.isConnected = false;
      await this.ensureConnection();
      return this.exists(relativePath);
    }
  }
  getPublicUrl(relativePath) {
    return `/uploads/${relativePath}`;
  }
  async disconnect() {
    if (this.client) {
      this.client.close();
      this.client = null;
      this.isConnected = false;
    }
  }
  // Método de prueba de conexión
  async testConnection() {
    try {
      await this.ensureConnection();
      return this.isConnected;
    } catch (error) {
      return false;
    }
  }
};

// server/services/smb-storage-provider.ts
import SMB2 from "@marsaud/smb2";
import path9 from "path";
var SMBStorageProvider = class {
  constructor(config) {
    this.client = null;
    this.config = {
      ...config,
      port: config.port || 445,
      basePath: config.basePath || "/uploads",
      domain: config.domain || ""
    };
    this.initializeClient();
  }
  initializeClient() {
    this.client = new SMB2({
      share: `\\\\${this.config.host}\\${this.config.share}`,
      domain: this.config.domain || "",
      username: this.config.username,
      password: this.config.password,
      port: this.config.port
    });
  }
  getSMBPath(relativePath) {
    const combined = path9.posix.join(this.config.basePath, relativePath);
    return combined.replace(/\//g, "\\");
  }
  async upload(file, relativePath) {
    const smbPath = this.getSMBPath(relativePath);
    const dir = path9.dirname(smbPath);
    return new Promise((resolve, reject) => {
      this.client.mkdir(dir, (err) => {
        if (err && err.code !== "STATUS_OBJECT_NAME_COLLISION") {
        }
        if (Buffer.isBuffer(file)) {
          this.client.writeFile(smbPath, file, (writeErr) => {
            if (writeErr) {
              reject(new Error(`Error al escribir archivo SMB: ${writeErr.message}`));
            } else {
              resolve(relativePath);
            }
          });
        } else {
          const writeStream = this.client.createWriteStream(smbPath);
          writeStream.on("error", (streamErr) => {
            reject(new Error(`Error al escribir stream SMB: ${streamErr.message}`));
          });
          writeStream.on("finish", () => {
            resolve(relativePath);
          });
          file.pipe(writeStream);
        }
      });
    });
  }
  async download(relativePath) {
    const smbPath = this.getSMBPath(relativePath);
    return new Promise((resolve, reject) => {
      this.client.readFile(smbPath, (err, data) => {
        if (err) {
          reject(new Error(`Error al leer archivo SMB: ${err.message}`));
        } else {
          resolve(data);
        }
      });
    });
  }
  async delete(relativePath) {
    const smbPath = this.getSMBPath(relativePath);
    return new Promise((resolve, reject) => {
      this.client.unlink(smbPath, (err) => {
        if (err) {
          reject(new Error(`Error al eliminar archivo SMB: ${err.message}`));
        } else {
          resolve();
        }
      });
    });
  }
  async list(relativePath = "", recursive = false) {
    const smbPath = this.getSMBPath(relativePath);
    const files = [];
    try {
      if (recursive) {
        await this.listRecursive(smbPath, relativePath, files);
      } else {
        const items = await this.readdir(smbPath);
        for (const item of items) {
          if (item.type === "file") {
            const filePath = path9.posix.join(relativePath, item.name);
            files.push(filePath);
          }
        }
      }
      return files;
    } catch (error) {
      return [];
    }
  }
  async readdir(smbPath) {
    return new Promise((resolve, reject) => {
      this.client.readdir(smbPath, (err, files) => {
        if (err) {
          reject(err);
        } else {
          const items = files.map((file) => ({
            name: file.name,
            type: file.type === "directory" ? "directory" : "file"
          }));
          resolve(items);
        }
      });
    });
  }
  async listRecursive(smbPath, relativePath, files) {
    const items = await this.readdir(smbPath);
    for (const item of items) {
      const itemRelativePath = path9.posix.join(relativePath, item.name);
      const itemSMBPath = path9.join(smbPath, item.name);
      if (item.type === "file") {
        files.push(itemRelativePath);
      } else if (item.type === "directory") {
        await this.listRecursive(itemSMBPath, itemRelativePath, files);
      }
    }
  }
  async exists(relativePath) {
    const smbPath = this.getSMBPath(relativePath);
    return new Promise((resolve) => {
      this.client.exists(smbPath, (err, exists) => {
        if (err) {
          resolve(false);
        } else {
          resolve(exists);
        }
      });
    });
  }
  getPublicUrl(relativePath) {
    return `/uploads/${relativePath}`;
  }
  async disconnect() {
    return new Promise((resolve) => {
      if (this.client) {
        this.client.disconnect();
        this.client = null;
      }
      resolve();
    });
  }
  // Método de prueba de conexión
  async testConnection() {
    try {
      const basePath = this.config.basePath.replace(/\//g, "\\");
      await this.readdir(basePath);
      return true;
    } catch (error) {
      return false;
    }
  }
};

// server/services/storage-factory.ts
import crypto4 from "crypto";
import path10 from "path";
var prisma18 = new PrismaClient18();
var ALGORITHM2 = "aes-256-gcm";
function getEncryptionKey2() {
  const envKey = process.env.STORAGE_ENCRYPTION_KEY;
  if (!envKey || envKey.length < 32) {
    throw new Error("STORAGE_ENCRYPTION_KEY no configurada o muy corta. Debe tener al menos 32 caracteres.");
  }
  return envKey;
}
function encryptPassword2(password) {
  const ENCRYPTION_KEY = getEncryptionKey2();
  const iv = crypto4.randomBytes(16);
  const cipher = crypto4.createCipheriv(ALGORITHM2, Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv);
  let encrypted = cipher.update(password, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}
function decryptPassword2(encryptedData) {
  try {
    const ENCRYPTION_KEY = getEncryptionKey2();
    const parts = encryptedData.split(":");
    if (parts.length !== 3) {
      throw new Error("Formato de datos cifrados inv\xE1lido");
    }
    const iv = Buffer.from(parts[0], "hex");
    const authTag = Buffer.from(parts[1], "hex");
    const encrypted = parts[2];
    const decipher = crypto4.createDecipheriv(ALGORITHM2, Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    throw new Error("Error al descifrar contrase\xF1a");
  }
}
var StorageFactory = class {
  static {
    this.instance = null;
  }
  static {
    this.currentConfigId = null;
  }
  // Obtener el provider de almacenamiento activo
  static async getActiveProvider() {
    const activeConfig = await prisma18.storage_configs.findFirst({
      where: { isActive: true }
    });
    if (!activeConfig || this.currentConfigId !== activeConfig.id || !this.instance) {
      this.instance = await this.createProvider(activeConfig);
      this.currentConfigId = activeConfig?.id || null;
    }
    return this.instance;
  }
  // Obtener provider para una configuración específica por ID
  static async getProviderById(configId) {
    const config = await prisma18.storage_configs.findUnique({
      where: { id: configId }
    });
    if (!config) {
      throw new Error(`Configuraci\xF3n de storage no encontrada: ${configId}`);
    }
    return this.createProvider(config);
  }
  // Crear provider según configuración
  static async createProvider(config) {
    if (!config || config.type === "LOCAL") {
      const basePath = config?.base_path ? path10.join(process.cwd(), config.base_path) : void 0;
      return new LocalStorageProvider(basePath);
    }
    if (config.type === "FTP") {
      if (!config.host || !config.port || !config.username || !config.encrypted_password) {
        throw new Error("Configuraci\xF3n FTP incompleta");
      }
      const ftpConfig = {
        host: config.host,
        port: config.port,
        user: config.username,
        password: decryptPassword2(config.encrypted_password),
        basePath: config.base_path || "/uploads",
        secure: false
        // Puede ser configurable
      };
      return new FTPStorageProvider(ftpConfig);
    }
    if (config.type === "SMB") {
      if (!config.host || !config.username || !config.encrypted_password) {
        throw new Error("Configuraci\xF3n SMB incompleta");
      }
      const pathParts = (config.base_path || "").split("/").filter((p) => p);
      const share = pathParts[0] || "uploads";
      const basePath = "/" + pathParts.slice(1).join("/");
      const smbConfig = {
        host: config.host,
        port: config.port || 445,
        domain: "",
        // Puede ser configurable
        username: config.username,
        password: decryptPassword2(config.encrypted_password),
        basePath: basePath || "/",
        share
      };
      return new SMBStorageProvider(smbConfig);
    }
    return new LocalStorageProvider("/uploads");
  }
  // Probar conexión con una configuración específica guardada
  static async testConfiguration(configId) {
    const config = await prisma18.storage_configs.findUnique({
      where: { id: configId }
    });
    if (!config) {
      throw new Error("Configuraci\xF3n no encontrada");
    }
    const provider = await this.createProvider(config);
    if ("testConnection" in provider && typeof provider.testConnection === "function") {
      return await provider.testConnection();
    }
    return true;
  }
  // Probar conexión con una configuración temporal (sin guardar)
  static async testConfigurationData(config) {
    try {
      const provider = await this.createProvider(config);
      if ("testConnection" in provider && typeof provider.testConnection === "function") {
        const success = await provider.testConnection();
        if (success) {
          return { success: true, message: "Conexi\xF3n exitosa" };
        } else {
          return { success: false, message: "Conexi\xF3n fallida" };
        }
      }
      return { success: true, message: "Provider creado correctamente" };
    } catch (error) {
      return { success: false, message: error.message || "Error al probar configuraci\xF3n" };
    }
  }
  // Limpiar instancia (útil para pruebas o cambio de configuración)
  static async clearInstance() {
    if (this.instance && "disconnect" in this.instance) {
      await this.instance.disconnect?.();
    }
    this.instance = null;
    this.currentConfigId = null;
  }
  // Crear provider para una configuración específica (sin activarla)
  static async createProviderForConfig(configId) {
    const config = await prisma18.storage_configs.findUnique({
      where: { id: configId }
    });
    if (!config) {
      throw new Error("Configuraci\xF3n no encontrada");
    }
    return await this.createProvider(config);
  }
};

// server/middleware/storage-upload.ts
import fs8 from "fs/promises";
import path11 from "path";
async function uploadToStorage(req, res, next) {
  try {
    if (!req.file && !req.files) {
      return next();
    }
    const provider = await StorageFactory.getActiveProvider();
    if (req.file) {
      await processFile(req.file, provider);
    }
    if (req.files && Array.isArray(req.files)) {
      for (const file of req.files) {
        await processFile(file, provider);
      }
    }
    if (req.files && !Array.isArray(req.files)) {
      for (const fieldname in req.files) {
        const files = req.files[fieldname];
        for (const file of files) {
          await processFile(file, provider);
        }
      }
    }
    next();
  } catch (error) {
    console.error("Error al subir archivo al storage:", error);
    next(error);
  }
}
async function processFile(file, provider) {
  const uploadsDir2 = path11.join(process.cwd(), "uploads");
  const relativePath = path11.relative(uploadsDir2, file.path);
  const isLocal = provider.constructor.name === "LocalStorageProvider";
  if (isLocal) {
    file.path = relativePath;
    file.destination = path11.dirname(relativePath);
    return;
  }
  const tempFilePath = file.path;
  const readStream = (await import("fs")).createReadStream(tempFilePath);
  try {
    await provider.upload(readStream, relativePath);
    file.path = relativePath;
    file.destination = path11.dirname(relativePath);
    await fs8.unlink(tempFilePath);
  } catch (error) {
    readStream.destroy();
    throw error;
  }
}

// server/services/tax-calendar-import.ts
import ExcelJS3 from "exceljs";
import { randomUUID as randomUUID7 } from "crypto";
init_prisma_client();
async function processExcelImport(buffer, userId) {
  const result = {
    imported: 0,
    errors: [],
    duplicates: [],
    success: false
  };
  try {
    if (!Buffer.isBuffer(buffer)) {
      result.errors.push("El archivo proporcionado no es v\xE1lido");
      return result;
    }
    const workbook = new ExcelJS3.Workbook();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.getWorksheet("Periodos");
    if (!worksheet) {
      result.errors.push('No se encontr\xF3 la hoja "Periodos" en el archivo Excel');
      return result;
    }
    const rows = [];
    const validationErrors = [];
    const seenKeys = /* @__PURE__ */ new Set();
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1 || rowNumber === 2) return;
      try {
        const rowData = parseRow(row, rowNumber);
        const errors = validateRow(rowData, rowNumber);
        if (errors.length > 0) {
          validationErrors.push(...errors);
          return;
        }
        const key = `${rowData.modelCode}-${rowData.period}-${rowData.year}`;
        if (seenKeys.has(key)) {
          result.duplicates.push(
            `Fila ${rowNumber}: Duplicado en Excel (${rowData.modelCode} - ${rowData.period} - ${rowData.year})`
          );
          return;
        }
        seenKeys.add(key);
        rows.push(rowData);
      } catch (error) {
        validationErrors.push({
          row: rowNumber,
          field: "general",
          message: error.message
        });
      }
    });
    if (validationErrors.length > 0) {
      result.errors.push(
        ...validationErrors.map(
          (e) => `Fila ${e.row} [${e.field}]: ${e.message}`
        )
      );
    }
    for (const rowData of rows) {
      try {
        const existing = await prisma_client_default.tax_calendar.findFirst({
          where: {
            modelCode: rowData.modelCode,
            period: rowData.period,
            year: rowData.year
          }
        });
        if (existing) {
          result.duplicates.push(
            `${rowData.modelCode} - ${rowData.period} - ${rowData.year} (ya existe en base de datos)`
          );
          continue;
        }
        const derived = calculateDerivedFields(rowData.startDate, rowData.endDate);
        await prisma_client_default.tax_calendar.create({
          data: {
            id: randomUUID7(),
            modelCode: rowData.modelCode,
            period: rowData.period,
            year: rowData.year,
            startDate: rowData.startDate,
            endDate: rowData.endDate,
            status: derived.status || "PENDIENTE",
            days_to_start: derived.daysToStart ?? null,
            days_to_end: derived.daysToEnd ?? null,
            active: rowData.active,
            locked: rowData.locked,
            createdAt: /* @__PURE__ */ new Date(),
            updatedAt: /* @__PURE__ */ new Date()
          }
        });
        result.imported++;
      } catch (error) {
        result.errors.push(
          `Error al importar ${rowData.modelCode} - ${rowData.period} - ${rowData.year}: ${error.message}`
        );
      }
    }
    result.success = result.imported > 0 || result.errors.length === 0 && result.duplicates.length > 0;
    return result;
  } catch (error) {
    result.errors.push(`Error procesando el archivo: ${error.message}`);
    return result;
  }
}
function parseRow(row, rowNumber) {
  return {
    modelCode: String(row.getCell(1).value || "").trim().toUpperCase(),
    period: String(row.getCell(2).value || "").trim().toUpperCase(),
    year: parseYear(row.getCell(3).value),
    startDate: parseDateValue(row.getCell(4).value, rowNumber, "startDate"),
    endDate: parseDateValue(row.getCell(5).value, rowNumber, "endDate"),
    active: parseBoolean(row.getCell(6).value ?? "SI"),
    locked: parseBoolean(row.getCell(7).value ?? "NO")
  };
}
function validateRow(row, rowNumber) {
  const errors = [];
  if (!row.modelCode) {
    errors.push({ row: rowNumber, field: "modelCode", message: "El c\xF3digo del modelo es obligatorio" });
  }
  if (!row.period) {
    errors.push({ row: rowNumber, field: "period", message: "El periodo es obligatorio" });
  }
  if (!row.year || row.year < 2e3 || row.year > 2100) {
    errors.push({ row: rowNumber, field: "year", message: "El a\xF1o debe estar entre 2000 y 2100" });
  }
  if (!row.startDate || isNaN(row.startDate.getTime())) {
    errors.push({ row: rowNumber, field: "startDate", message: "Fecha de inicio inv\xE1lida" });
  }
  if (!row.endDate || isNaN(row.endDate.getTime())) {
    errors.push({ row: rowNumber, field: "endDate", message: "Fecha de fin inv\xE1lida" });
  }
  if (row.startDate && row.endDate && row.endDate <= row.startDate) {
    errors.push({
      row: rowNumber,
      field: "endDate",
      message: "La fecha de fin debe ser posterior a la fecha de inicio"
    });
  }
  return errors;
}
function parseDateValue(value, rowNumber, fieldName) {
  if (!value) {
    throw new Error(`${fieldName} es obligatorio`);
  }
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === "number") {
    const excelEpoch = new Date(1900, 0, 1);
    const date = new Date(excelEpoch.getTime() + (value - 2) * 24 * 60 * 60 * 1e3);
    return date;
  }
  if (typeof value === "string") {
    const formats = [
      // DD/MM/YYYY
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
      // YYYY-MM-DD
      /^(\d{4})-(\d{1,2})-(\d{1,2})$/
    ];
    for (const format2 of formats) {
      const match = value.match(format2);
      if (match) {
        if (format2.source.startsWith("^(\\d{1,2})")) {
          const [, day, month, year] = match;
          const date2 = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          if (!isNaN(date2.getTime())) return date2;
        } else {
          const [, year, month, day] = match;
          const date2 = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          if (!isNaN(date2.getTime())) return date2;
        }
      }
    }
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  throw new Error(`${fieldName}: Formato de fecha inv\xE1lido. Use DD/MM/YYYY o YYYY-MM-DD`);
}
function parseYear(value) {
  if (typeof value === "number") {
    return Math.floor(value);
  }
  if (typeof value === "string") {
    const num = parseInt(value, 10);
    if (!isNaN(num)) return num;
  }
  return NaN;
}
function parseBoolean(value) {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value !== 0;
  }
  if (typeof value === "string") {
    const str = value.toLowerCase().trim();
    return str === "si" || str === "yes" || str === "true" || str === "1" || str === "s\xED";
  }
  return false;
}
async function generateTemplate() {
  const workbook = new ExcelJS3.Workbook();
  workbook.creator = "Asesor\xEDa La Llave";
  workbook.created = /* @__PURE__ */ new Date();
  const instructionsSheet = workbook.addWorksheet("Instrucciones");
  instructionsSheet.columns = [{ width: 80 }];
  instructionsSheet.addRow(["PLANTILLA DE IMPORTACI\xD3N - CALENDARIO FISCAL AEAT"]);
  instructionsSheet.getRow(1).font = { size: 16, bold: true };
  instructionsSheet.addRow([]);
  instructionsSheet.addRow(["INSTRUCCIONES:"]);
  instructionsSheet.getRow(3).font = { bold: true, size: 12 };
  instructionsSheet.addRow(['1. Complete la hoja "Periodos" con los datos fiscales']);
  instructionsSheet.addRow(["2. Los campos marcados con * son OBLIGATORIOS"]);
  instructionsSheet.addRow(["3. No elimine ni renombre las columnas"]);
  instructionsSheet.addRow(["4. Las fechas deben estar en formato DD/MM/YYYY o YYYY-MM-DD"]);
  instructionsSheet.addRow(['5. El campo "active" debe ser SI o NO (por defecto: SI)']);
  instructionsSheet.addRow(['6. El campo "locked" debe ser SI o NO (por defecto: NO)']);
  instructionsSheet.addRow([]);
  instructionsSheet.addRow(["EJEMPLOS DE VALORES V\xC1LIDOS:"]);
  instructionsSheet.getRow(11).font = { bold: true, size: 12 };
  instructionsSheet.addRow(["\u2022 Modelo: 303, 111, 130, 190, 347, etc."]);
  instructionsSheet.addRow(["\u2022 Periodo: 1T, 2T, 3T, 4T (trimestral), M01-M12 (mensual), ANUAL"]);
  instructionsSheet.addRow(["\u2022 A\xF1o: 2025, 2026, etc."]);
  instructionsSheet.addRow(["\u2022 Fecha Inicio: 01/01/2025 o 2025-01-01"]);
  instructionsSheet.addRow(["\u2022 Fecha Fin: 20/04/2025 o 2025-04-20"]);
  instructionsSheet.addRow(["\u2022 Activo: SI o NO"]);
  instructionsSheet.addRow(["\u2022 Bloqueado: SI o NO"]);
  instructionsSheet.addRow([]);
  instructionsSheet.addRow(["NOTA IMPORTANTE:"]);
  instructionsSheet.getRow(20).font = { bold: true, color: { argb: "FFFF0000" } };
  instructionsSheet.addRow(['Los campos "status", "days_to_start" y "days_to_end" se calculan autom\xE1ticamente.']);
  instructionsSheet.addRow(['NO los incluya en la hoja "Periodos".']);
  const periodosSheet = workbook.addWorksheet("Periodos");
  periodosSheet.columns = [
    { header: "A) C\xF3digo Modelo* (modelCode)", key: "modelCode", width: 30 },
    { header: "B) Periodo* (period)", key: "period", width: 20 },
    { header: "C) A\xF1o* (year)", key: "year", width: 12 },
    { header: "D) Fecha Inicio* (startDate)", key: "startDate", width: 22 },
    { header: "E) Fecha Fin* (endDate)", key: "endDate", width: 22 },
    { header: "F) Activo (active)", key: "active", width: 15 },
    { header: "G) Bloqueado (locked)", key: "locked", width: 18 }
  ];
  periodosSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  periodosSheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF4472C4" }
  };
  periodosSheet.getRow(1).alignment = { horizontal: "center", vertical: "middle" };
  periodosSheet.addRow({
    modelCode: "Ej: 303, 111, 130, 190",
    period: "Ej: 1T, 2T, M01, ANUAL",
    year: "Ej: 2025",
    startDate: "DD/MM/YYYY",
    endDate: "DD/MM/YYYY",
    active: "SI o NO",
    locked: "SI o NO"
  });
  periodosSheet.getRow(2).font = { italic: true, color: { argb: "FF666666" } };
  periodosSheet.getRow(2).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFEF2CB" }
  };
  periodosSheet.getRow(2).alignment = { horizontal: "left", vertical: "middle" };
  periodosSheet.addRow({
    modelCode: "303",
    period: "1T",
    year: 2025,
    startDate: "01/01/2025",
    endDate: "20/04/2025",
    active: "SI",
    locked: "NO"
  });
  periodosSheet.addRow({
    modelCode: "303",
    period: "2T",
    year: 2025,
    startDate: "01/04/2025",
    endDate: "20/07/2025",
    active: "SI",
    locked: "NO"
  });
  periodosSheet.addRow({
    modelCode: "111",
    period: "M01",
    year: 2025,
    startDate: "01/01/2025",
    endDate: "20/02/2025",
    active: "SI",
    locked: "NO"
  });
  periodosSheet.addRow({
    modelCode: "130",
    period: "1T",
    year: 2025,
    startDate: "01/01/2025",
    endDate: "20/04/2025",
    active: "SI",
    locked: "NO"
  });
  const modelosSheet = workbook.addWorksheet("Modelos_Referencia");
  modelosSheet.columns = [
    { header: "C\xF3digo", key: "code", width: 10 },
    { header: "Nombre", key: "name", width: 50 }
  ];
  modelosSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  modelosSheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF70AD47" }
  };
  const modelos = [
    { code: "100", name: "IRPF - Renta" },
    { code: "111", name: "Retenciones - Rendimientos del trabajo" },
    { code: "130", name: "IRPF - Pagos fraccionados" },
    { code: "131", name: "IRPF - Pagos fraccionados (simplificado)" },
    { code: "180", name: "IP - Impuesto sobre el Patrimonio" },
    { code: "190", name: "Resumen anual retenciones" },
    { code: "200", name: "Impuesto sobre Sociedades" },
    { code: "202", name: "Pagos fraccionados IS" },
    { code: "303", name: "IVA - Autoliquidaci\xF3n" },
    { code: "347", name: "Declaraci\xF3n anual operaciones con terceros" },
    { code: "349", name: "Declaraci\xF3n recapitulativa (intracomunitaria)" },
    { code: "390", name: "IVA - Declaraci\xF3n recapitulativa" },
    { code: "720", name: "Declaraci\xF3n informativa bienes en el exterior" }
  ];
  modelos.forEach((modelo) => {
    modelosSheet.addRow(modelo);
  });
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

// server/routes.ts
init_reports_service();

// server/middleware/rate-limit.ts
import rateLimit from "express-rate-limit";
var loginLimiter = process.env.DISABLE_LOGIN_RATE_LIMIT === "1" ? ((req, res, next) => next()) : rateLimit({
  windowMs: 15 * 60 * 1e3,
  // 15 minutos
  max: 5,
  // Máximo 5 intentos por IP en 15 minutos
  message: {
    error: "Demasiados intentos de inicio de sesi\xF3n. Por favor, int\xE9ntalo de nuevo en 15 minutos."
  },
  standardHeaders: true,
  // Retorna info en headers `RateLimit-*`
  legacyHeaders: false,
  // Desactiva headers `X-RateLimit-*`
  skipSuccessfulRequests: false,
  // Contar todos los intentos (exitosos y fallidos)
  skipFailedRequests: false,
  // Logging de bloqueos
  handler: (req, res) => {
    console.warn(`[SECURITY] Rate limit excedido en login desde IP: ${req.ip}`);
    res.status(429).json({
      error: "Demasiados intentos de inicio de sesi\xF3n. Por favor, int\xE9ntalo de nuevo en 15 minutos.",
      retryAfter: Math.ceil(15 * 60)
      // segundos
    });
  }
});
var registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1e3,
  // 1 hora
  max: 3,
  // Máximo 3 registros por IP por hora
  message: {
    error: "Demasiados intentos de registro. Por favor, int\xE9ntalo de nuevo m\xE1s tarde."
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`[SECURITY] Rate limit excedido en registro desde IP: ${req.ip}`);
    res.status(429).json({
      error: "Demasiados intentos de registro. Por favor, int\xE9ntalo de nuevo en 1 hora.",
      retryAfter: Math.ceil(60 * 60)
    });
  }
});
var apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1e3,
  // 15 minutos
  max: 1e3,
  // Máximo 1000 requests por IP en 15 minutos (permite cálculos en tiempo real)
  message: {
    error: "Demasiadas solicitudes. Por favor, int\xE9ntalo de nuevo m\xE1s tarde."
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`[SECURITY] Rate limit excedido en API desde IP: ${req.ip} - Endpoint: ${req.path}`);
    res.status(429).json({
      error: "Demasiadas solicitudes. Por favor, int\xE9ntalo de nuevo m\xE1s tarde.",
      retryAfter: Math.ceil(15 * 60)
    });
  }
});
var strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1e3,
  // 1 hora
  max: 10,
  // Máximo 10 operaciones por hora
  message: {
    error: "L\xEDmite de operaciones excedido. Contacte al administrador si necesita realizar m\xE1s acciones."
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`[SECURITY] Rate limit ESTRICTO excedido desde IP: ${req.ip} - Endpoint: ${req.path}`);
    res.status(429).json({
      error: "L\xEDmite de operaciones excedido. Por favor, int\xE9ntalo de nuevo en 1 hora.",
      retryAfter: Math.ceil(60 * 60)
    });
  }
});
var budgetCalculationLimiter = rateLimit({
  windowMs: 1 * 60 * 1e3,
  // 1 minuto
  max: 120,
  // Máximo 120 requests por minuto (2 por segundo)
  message: {
    error: "Demasiados c\xE1lculos. Por favor, espera un momento."
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: (req, res) => {
    console.warn(`[SECURITY] Rate limit de c\xE1lculos excedido desde IP: ${req.ip}`);
    res.status(429).json({
      error: "Demasiados c\xE1lculos. Por favor, espera un momento.",
      retryAfter: 60
    });
  }
});

// server/epic-tasks-routes.ts
import { PrismaClient as PrismaClient19 } from "@prisma/client";
import multer2 from "multer";
import path12 from "path";
import fs9 from "fs";
import { randomUUID as randomUUID8 } from "crypto";
var prisma19 = new PrismaClient19();
var tasksUploadsDir = path12.join(process.cwd(), "uploads", "tasks", "attachments");
if (!fs9.existsSync(tasksUploadsDir)) {
  fs9.mkdirSync(tasksUploadsDir, { recursive: true });
}
var taskAttachmentsStorage = multer2.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tasksUploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});
var uploadTaskAttachment = multer2({
  storage: taskAttachmentsStorage,
  limits: { fileSize: 10 * 1024 * 1024 }
  // 10MB max
});
function registerEpicTasksRoutes(app2) {
  app2.get("/api/tasks/:taskId/comments", authenticateToken, async (req, res) => {
    try {
      const { taskId } = req.params;
      const comments = await prisma19.task_comments.findMany({
        where: { taskId },
        include: {
          users: {
            select: {
              id: true,
              username: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: "asc" }
      });
      res.json(comments);
    } catch (error) {
      logger.error({ err: error }, "Error al obtener comentarios");
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/tasks/:taskId/comments", authenticateToken, async (req, res) => {
    try {
      const { taskId } = req.params;
      const { contenido } = req.body;
      if (!contenido || contenido.trim() === "") {
        return res.status(400).json({ error: "El contenido del comentario es requerido" });
      }
      const task = await prisma19.tasks.findUnique({ where: { id: taskId } });
      if (!task) {
        return res.status(404).json({ error: "Tarea no encontrada" });
      }
      const comment = await prisma19.task_comments.create({
        data: {
          id: randomUUID8(),
          tasks: { connect: { id: taskId } },
          users: { connect: { id: req.user.id } },
          contenido,
          updatedAt: /* @__PURE__ */ new Date()
        },
        include: {
          users: {
            select: {
              id: true,
              username: true,
              email: true
            }
          }
        }
      });
      await prisma19.task_activities.create({
        data: {
          id: randomUUID8(),
          taskId,
          userId: req.user.id,
          accion: "commented",
          descripcion: `${req.user.username} a\xF1adi\xF3 un comentario`,
          metadata: JSON.stringify({ commentId: comment.id })
        }
      });
      res.json(comment);
    } catch (error) {
      logger.error({ err: error }, "Error al crear comentario");
      res.status(500).json({ error: error.message });
    }
  });
  app2.patch("/api/tasks/:taskId/comments/:commentId", authenticateToken, async (req, res) => {
    try {
      const { taskId, commentId } = req.params;
      const { contenido } = req.body;
      const comment = await prisma19.task_comments.findUnique({
        where: { id: commentId }
      });
      if (!comment) {
        return res.status(404).json({ error: "Comentario no encontrado" });
      }
      if (comment.userId !== req.user.id) {
        return res.status(403).json({ error: "No tienes permiso para editar este comentario" });
      }
      const updated = await prisma19.task_comments.update({
        where: { id: commentId },
        data: {
          contenido,
          updatedAt: /* @__PURE__ */ new Date()
        },
        include: {
          users: {
            select: {
              id: true,
              username: true,
              email: true
            }
          }
        }
      });
      res.json(updated);
    } catch (error) {
      logger.error({ err: error }, "Error al editar comentario");
      res.status(500).json({ error: error.message });
    }
  });
  app2.delete("/api/tasks/:taskId/comments/:commentId", authenticateToken, async (req, res) => {
    try {
      const { commentId } = req.params;
      const comment = await prisma19.task_comments.findUnique({
        where: { id: commentId }
      });
      if (!comment) {
        return res.status(404).json({ error: "Comentario no encontrado" });
      }
      if (comment.userId !== req.user.id && !req.user.permissions.includes("admin:settings")) {
        return res.status(403).json({ error: "No tienes permiso para eliminar este comentario" });
      }
      await prisma19.task_comments.delete({
        where: { id: commentId }
      });
      res.status(204).end();
    } catch (error) {
      logger.error({ err: error }, "Error al eliminar comentario");
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/tasks/:taskId/attachments", authenticateToken, async (req, res) => {
    try {
      const { taskId } = req.params;
      const attachments = await prisma19.task_attachments.findMany({
        where: { taskId },
        include: {
          users: {
            select: {
              id: true,
              username: true
            }
          }
        },
        orderBy: { uploaded_at: "desc" }
      });
      res.json(attachments);
    } catch (error) {
      logger.error({ err: error }, "Error al obtener adjuntos");
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/tasks/:taskId/attachments", authenticateToken, uploadTaskAttachment.single("file"), async (req, res) => {
    try {
      const { taskId } = req.params;
      if (!req.file) {
        return res.status(400).json({ error: "No se proporcion\xF3 ning\xFAn archivo" });
      }
      const task = await prisma19.tasks.findUnique({ where: { id: taskId } });
      if (!task) {
        return res.status(404).json({ error: "Tarea no encontrada" });
      }
      const attachment = await prisma19.task_attachments.create({
        data: {
          id: randomUUID8(),
          tasks: { connect: { id: taskId } },
          users: { connect: { id: req.user.id } },
          fileName: req.file.filename,
          original_name: req.file.originalname,
          filePath: `/uploads/tasks/attachments/${req.file.filename}`,
          file_type: req.file.mimetype,
          fileSize: req.file.size
        },
        include: {
          users: {
            select: {
              id: true,
              username: true
            }
          }
        }
      });
      await prisma19.task_activities.create({
        data: {
          id: randomUUID8(),
          taskId,
          userId: req.user.id,
          accion: "attachment_added",
          descripcion: `${req.user.username} a\xF1adi\xF3 un adjunto: ${req.file.originalname}`,
          metadata: JSON.stringify({ attachmentId: attachment.id, fileName: req.file.originalname })
        }
      });
      res.json(attachment);
    } catch (error) {
      logger.error({ err: error }, "Error al subir adjunto");
      res.status(500).json({ error: error.message });
    }
  });
  app2.delete("/api/tasks/:taskId/attachments/:attachmentId", authenticateToken, async (req, res) => {
    try {
      const { attachmentId } = req.params;
      const attachment = await prisma19.task_attachments.findUnique({
        where: { id: attachmentId }
      });
      if (!attachment) {
        return res.status(404).json({ error: "Adjunto no encontrado" });
      }
      if (attachment.userId !== req.user.id && !req.user.permissions.includes("admin:settings")) {
        return res.status(403).json({ error: "No tienes permiso para eliminar este adjunto" });
      }
      const filePath = path12.join(process.cwd(), "uploads", "tasks", "attachments", attachment.fileName);
      if (fs9.existsSync(filePath)) {
        fs9.unlinkSync(filePath);
      }
      await prisma19.task_attachments.delete({
        where: { id: attachmentId }
      });
      res.status(204).end();
    } catch (error) {
      logger.error({ err: error }, "Error al eliminar adjunto");
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/tasks/:taskId/time-entries", authenticateToken, async (req, res) => {
    try {
      const { taskId } = req.params;
      const entries = await prisma19.task_time_entries.findMany({
        where: { taskId },
        include: {
          users: {
            select: {
              id: true,
              username: true
            }
          }
        },
        orderBy: { fecha: "desc" }
      });
      res.json(entries);
    } catch (error) {
      logger.error({ err: error }, "Error al obtener registros de tiempo");
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/tasks/:taskId/time-entries", authenticateToken, async (req, res) => {
    try {
      const { taskId } = req.params;
      const { minutos, descripcion, startedAt, endedAt } = req.body;
      if (!minutos || minutos <= 0) {
        return res.status(400).json({ error: "Los minutos deben ser mayores a 0" });
      }
      const task = await prisma19.tasks.findUnique({ where: { id: taskId } });
      if (!task) {
        return res.status(404).json({ error: "Tarea no encontrada" });
      }
      const entry = await prisma19.task_time_entries.create({
        data: {
          id: randomUUID8(),
          tasks: { connect: { id: taskId } },
          users: { connect: { id: req.user.id } },
          minutos,
          descripcion: descripcion || null,
          started_at: startedAt ? new Date(startedAt) : null,
          ended_at: endedAt ? new Date(endedAt) : null
        },
        include: {
          users: {
            select: {
              id: true,
              username: true
            }
          }
        }
      });
      await prisma19.tasks.update({
        where: { id: taskId },
        data: {
          tiempo_invertido: task.tiempo_invertido + minutos
        }
      });
      await prisma19.task_activities.create({
        data: {
          id: randomUUID8(),
          taskId,
          userId: req.user.id,
          accion: "time_logged",
          descripcion: `${req.user.username} registr\xF3 ${minutos} minutos`,
          metadata: JSON.stringify({ entryId: entry.id, minutos })
        }
      });
      res.json(entry);
    } catch (error) {
      logger.error({ err: error }, "Error al registrar tiempo");
      res.status(500).json({ error: error.message });
    }
  });
  app2.delete("/api/tasks/:taskId/time-entries/:entryId", authenticateToken, async (req, res) => {
    try {
      const { taskId, entryId } = req.params;
      const entry = await prisma19.task_time_entries.findUnique({
        where: { id: entryId }
      });
      if (!entry) {
        return res.status(404).json({ error: "Registro no encontrado" });
      }
      if (entry.userId !== req.user.id) {
        return res.status(403).json({ error: "No tienes permiso para eliminar este registro" });
      }
      const task = await prisma19.tasks.findUnique({ where: { id: taskId } });
      if (task) {
        await prisma19.tasks.update({
          where: { id: taskId },
          data: {
            tiempo_invertido: Math.max(0, task.tiempo_invertido - entry.minutos)
          }
        });
      }
      await prisma19.task_time_entries.delete({
        where: { id: entryId }
      });
      res.status(204).end();
    } catch (error) {
      logger.error({ err: error }, "Error al eliminar registro de tiempo");
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/tasks/:taskId/activities", authenticateToken, async (req, res) => {
    try {
      const { taskId } = req.params;
      const activities = await prisma19.task_activities.findMany({
        where: { taskId },
        include: {
          users: {
            select: {
              id: true,
              username: true
            }
          }
        },
        orderBy: { createdAt: "desc" },
        take: 100
        // Últimas 100 actividades
      });
      res.json(activities);
    } catch (error) {
      logger.error({ err: error }, "Error al obtener actividades");
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/tasks/:taskId/subtasks", authenticateToken, async (req, res) => {
    try {
      const { taskId } = req.params;
      const subtasks = await prisma19.tasks.findMany({
        where: { parent_task_id: taskId },
        include: {
          users: {
            select: {
              id: true,
              username: true
            }
          }
        },
        orderBy: { orden: "asc" }
      });
      res.json(subtasks);
    } catch (error) {
      logger.error({ err: error }, "Error al obtener subtareas");
      res.status(500).json({ error: error.message });
    }
  });
  app2.patch("/api/tasks/:taskId/move", authenticateToken, async (req, res) => {
    try {
      const { taskId } = req.params;
      const { estado, orden } = req.body;
      const task = await prisma19.tasks.findUnique({ where: { id: taskId } });
      if (!task) {
        return res.status(404).json({ error: "Tarea no encontrada" });
      }
      const updatedTask = await prisma19.tasks.update({
        where: { id: taskId },
        data: {
          ...estado !== void 0 && { estado },
          ...orden !== void 0 && { orden },
          fecha_actualizacion: /* @__PURE__ */ new Date()
        }
      });
      if (estado && estado !== task.estado) {
        await prisma19.task_activities.create({
          data: {
            id: randomUUID8(),
            taskId,
            userId: req.user.id,
            accion: "status_changed",
            descripcion: `${req.user.username} cambi\xF3 el estado de ${task.estado} a ${estado}`,
            metadata: JSON.stringify({ oldStatus: task.estado, newStatus: estado })
          }
        });
      }
      res.json(updatedTask);
    } catch (error) {
      logger.error({ err: error }, "Error al mover tarea");
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/tasks/analytics/overview", authenticateToken, async (req, res) => {
    try {
      const [
        total,
        pendientes,
        enProgreso,
        completadas,
        vencidas,
        porPrioridad,
        porUsuario
      ] = await Promise.all([
        prisma19.tasks.count({ where: { is_archived: false } }),
        prisma19.tasks.count({ where: { estado: "PENDIENTE", is_archived: false } }),
        prisma19.tasks.count({ where: { estado: "EN_PROGRESO", is_archived: false } }),
        prisma19.tasks.count({ where: { estado: "COMPLETADA", is_archived: false } }),
        prisma19.tasks.count({
          where: {
            fecha_vencimiento: { lt: /* @__PURE__ */ new Date() },
            estado: { not: "COMPLETADA" },
            is_archived: false
          }
        }),
        prisma19.tasks.groupBy({
          by: ["prioridad"],
          where: { is_archived: false },
          _count: true
        }),
        prisma19.tasks.groupBy({
          by: ["asignado_a"],
          where: { is_archived: false, asignado_a: { not: null } },
          _count: true
        })
      ]);
      res.json({
        total,
        porEstado: {
          pendientes,
          enProgreso,
          completadas,
          vencidas
        },
        porPrioridad: porPrioridad.map((p) => ({
          prioridad: p.prioridad,
          count: p._count
        })),
        porUsuario: porUsuario.map((u) => ({
          userId: u.asignado_a,
          count: u._count
        }))
      });
    } catch (error) {
      logger.error({ err: error }, "Error al obtener analytics");
      res.status(500).json({ error: error.message });
    }
  });
  logger.info("\u{1F680} Epic Tasks routes registered successfully");
}

// server/routes.ts
import nodemailer6 from "nodemailer";
import { exec as exec2 } from "child_process";
import { promisify as promisify2 } from "util";
var execPromise = promisify2(exec2);
var prisma20 = new PrismaClient20();
if (!process.env.JWT_SECRET) {
  throw new Error("FATAL: JWT_SECRET no est\xE1 configurado. Este valor es OBLIGATORIO para la seguridad del sistema.");
}
var JWT_SECRET2 = process.env.JWT_SECRET;
var SALT_ROUNDS = 10;
var uploadsDir = path13.join(process.cwd(), "uploads");
var manualsImagesDir = path13.join(uploadsDir, "manuals", "images");
var manualsAttachmentsDir = path13.join(uploadsDir, "manuals", "attachments");
[uploadsDir, manualsImagesDir, manualsAttachmentsDir].forEach((dir) => {
  if (!fs10.existsSync(dir)) {
    fs10.mkdirSync(dir, { recursive: true });
  }
});
var imagesMimeTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
var attachmentsMimeTypes = [
  ...imagesMimeTypes,
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
  "application/x-zip-compressed"
];
var multerStorageImages = multer3.diskStorage({
  destination: (req, file, cb) => {
    cb(null, manualsImagesDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});
var multerStorageAttachments = multer3.diskStorage({
  destination: (req, file, cb) => {
    cb(null, manualsAttachmentsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});
var upload2 = multer3({
  storage: multer3.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${uniqueSuffix}-${file.originalname}`);
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 }
  // 10MB max
});
var uploadExcel = multer3({
  storage: multer3.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  // 10MB max
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      // .xlsx
      "application/vnd.ms-excel"
      // .xls
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Solo se permiten archivos Excel (.xlsx, .xls)"));
    }
  }
});
var uploadManualImage = multer3({
  storage: multerStorageImages,
  limits: { fileSize: 5 * 1024 * 1024 },
  // 5MB max para imágenes
  fileFilter: (req, file, cb) => {
    if (imagesMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Solo se permiten im\xE1genes (JPEG, PNG, GIF, WebP)"));
    }
  }
});
var uploadManualAttachment = multer3({
  storage: multerStorageAttachments,
  limits: { fileSize: 10 * 1024 * 1024 },
  // 10MB max para adjuntos
  fileFilter: (req, file, cb) => {
    if (attachmentsMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Tipo de archivo no permitido"));
    }
  }
});
var authenticateToken2 = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Token no proporcionado" });
    }
    const decoded = jwt3.verify(token, JWT_SECRET2);
    const user = await prismaStorage.getUserWithPermissions(decoded.id);
    if (!user) {
      return res.status(401).json({ error: "Usuario no encontrado" });
    }
    const permissions = user.roles?.role_permissions?.map(
      (rp) => `${rp.permissions.resource}:${rp.permissions.action}`
    ) || [];
    req.user = {
      id: user.id,
      username: user.username,
      roleId: user.roleId,
      roleName: user.roles?.name || null,
      permissions
    };
    next();
  } catch (error) {
    return res.status(403).json({ error: "Token inv\xE1lido" });
  }
};
var checkPermission = (requiredPermission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Usuario no autenticado" });
    }
    if (req.user.roleName === "Administrador") {
      return next();
    }
    if (!req.user.permissions.includes(requiredPermission)) {
      return res.status(403).json({
        error: "No tienes permisos para esta acci\xF3n",
        required: requiredPermission
      });
    }
    next();
  };
};
async function createAudit(usuarioId, accion, tabla, registroId, valorAnterior = null, valorNuevo = null) {
  try {
    let cambios = "";
    if (accion === "CREATE") {
      cambios = `Nuevo registro creado en ${tabla}`;
    } else if (accion === "DELETE") {
      cambios = `Registro eliminado de ${tabla}`;
    } else if (accion === "UPDATE" && valorAnterior && valorNuevo) {
      const cambiosArray = [];
      Object.keys(valorNuevo).forEach((key) => {
        if (valorAnterior[key] !== valorNuevo[key] && !["fechaActualizacion", "updated_at"].includes(key)) {
          cambiosArray.push(`${key}: "${valorAnterior[key]}" \u2192 "${valorNuevo[key]}"`);
        }
      });
      cambios = cambiosArray.length > 0 ? cambiosArray.join(", ") : "Sin cambios detectados";
    }
    await prismaStorage.createAuditEntry({
      usuarioId,
      accion,
      tabla,
      registroId,
      valorAnterior: valorAnterior ? JSON.stringify(valorAnterior) : null,
      valorNuevo: valorNuevo ? JSON.stringify(valorNuevo) : null,
      cambios
    });
  } catch (error) {
    console.error("Error al crear auditor\xEDa:", error);
  }
}
async function registerRoutes(app2, options) {
  if (!options?.skipDbInit) {
    try {
      await prismaStorage.ensureTaxModelsConfigSeeded();
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo inicializar tax_models_config";
      logger.fatal(
        {
          err: error,
          remediation: "Ejecuta `npx prisma db push` y reinicia el servidor"
        },
        message
      );
      throw error;
    }
  } else {
    logger.warn("Se ha saltado la inicializaci\xF3n de tax_models_config por configuraci\xF3n (skipDbInit=true)");
  }
  app2.use("/api", (req, res, next) => {
    if (req.path === "/health" || req.path === "/api/health") {
      return next();
    }
    if (req.path === "/gestoria-budgets/calculate") {
      return next();
    }
    return apiLimiter(req, res, next);
  });
  app2.get("/api/health", async (req, res) => {
    try {
      await prismaStorage.getAllUsers();
      res.status(200).json({
        status: "healthy",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        database: "connected"
      });
    } catch (error) {
      res.status(503).json({
        status: "unhealthy",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        database: "disconnected"
      });
    }
  });
  app2.post(
    "/api/auth/register",
    registerLimiter,
    validateZod(registerSchema),
    async (req, res) => {
      try {
        const { username, email, password, roleId } = req.body;
        const existingUser = await prismaStorage.getUserByUsername(username);
        if (existingUser) {
          return res.status(400).json({ error: "El usuario ya existe" });
        }
        const existingEmail = await prismaStorage.getUserByEmail(email);
        if (existingEmail) {
          return res.status(400).json({ error: "El email ya est\xE1 registrado" });
        }
        let defaultRoleId = roleId;
        if (!defaultRoleId) {
          const defaultRole = await prisma20.roles.findUnique({
            where: { name: "Gestor" }
          });
          if (defaultRole) {
            defaultRoleId = defaultRole.id;
          }
        }
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        const user = await prismaStorage.createUser({
          username,
          email,
          password: hashedPassword,
          roleId: defaultRoleId || null
        });
        const token = jwt3.sign({ id: user.id, username: user.username, roleId: user.roleId }, JWT_SECRET2, {
          expiresIn: "24h"
        });
        const { password: _, ...userWithoutPassword } = user;
        res.json({ user: userWithoutPassword, token });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.post("/api/auth/login", loginLimiter, async (req, res) => {
    try {
      const { username, password } = req.body;
      const user = await prismaStorage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ error: "Credenciales incorrectas" });
      }
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: "Credenciales incorrectas" });
      }
      if (!user.isActive) {
        return res.status(403).json({ error: "Usuario desactivado. Contacte al administrador" });
      }
      const token = jwt3.sign({ id: user.id, username: user.username, roleId: user.roleId }, JWT_SECRET2, {
        expiresIn: "24h"
      });
      const fullUser = await prismaStorage.getUserWithPermissions(user.id);
      if (!fullUser) {
        return res.status(500).json({ error: "Error al obtener informaci\xF3n del usuario" });
      }
      const { password: _, ...userWithoutPassword } = fullUser;
      const permissions = fullUser.roles?.role_permissions?.map(
        (rp) => `${rp.permissions.resource}:${rp.permissions.action}`
      ) || [];
      const roleName = fullUser.roles?.name || null;
      res.json({ user: { ...userWithoutPassword, permissions, roleName }, token });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/auth/logout", (req, res) => {
    res.json({ message: "Sesi\xF3n cerrada exitosamente" });
  });
  app2.get("/api/auth/profile", authenticateToken2, async (req, res) => {
    try {
      const user = await prismaStorage.getUserWithPermissions(req.user.id);
      if (!user) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }
      const { password: _, ...userWithoutPassword } = user;
      const permissions = user.roles?.role_permissions?.map(
        (rp) => `${rp.permissions.resource}:${rp.permissions.action}`
      ) || [];
      const roleName = user.roles?.name || null;
      const isOwner = user.is_owner || false;
      res.json({ ...userWithoutPassword, permissions, roleName, is_owner: isOwner });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/users", authenticateToken2, async (req, res) => {
    try {
      const users = await prisma20.users.findMany({
        select: {
          id: true,
          username: true,
          email: true,
          createdAt: true,
          isActive: true,
          is_owner: true,
          roleId: true,
          roles: {
            select: {
              name: true,
              description: true
            }
          }
        }
      });
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post(
    "/api/users",
    authenticateToken2,
    checkPermission("users:create"),
    validateZod(userCreateSchema),
    async (req, res) => {
      try {
        const { username, email, password, roleId } = req.body;
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        const user = await prismaStorage.createUser({
          username,
          email,
          password: hashedPassword,
          roleId
        });
        const { password: _, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.patch(
    "/api/users/:id",
    authenticateToken2,
    checkPermission("users:update"),
    async (req, res) => {
      try {
        const { id } = req.params;
        const updateData = { ...req.body };
        if (updateData.password) {
          updateData.password = await bcrypt.hash(updateData.password, SALT_ROUNDS);
        }
        const user = await prismaStorage.updateUser(id, updateData);
        if (!user) {
          return res.status(404).json({ error: "Usuario no encontrado" });
        }
        const { password: _, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.patch(
    "/api/users/:id/toggle-active",
    authenticateToken2,
    checkPermission("users:update"),
    async (req, res) => {
      try {
        const { id } = req.params;
        const user = await prismaStorage.getUser(id);
        if (!user) {
          return res.status(404).json({ error: "Usuario no encontrado" });
        }
        const newActiveState = !user.isActive;
        const updatedUser = await prismaStorage.updateUser(id, { isActive: newActiveState });
        if (!updatedUser) {
          return res.status(404).json({ error: "Usuario no encontrado" });
        }
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: newActiveState ? `Activ\xF3 el usuario ${user.username}` : `Desactiv\xF3 el usuario ${user.username}`,
          modulo: "admin",
          detalles: `Estado: ${newActiveState ? "Activo" : "Inactivo"}`
        });
        const { password: _, ...userWithoutPassword } = updatedUser;
        res.json(userWithoutPassword);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.post(
    "/api/users/:id/transfer-owner",
    authenticateToken2,
    async (req, res) => {
      try {
        const { id } = req.params;
        const currentUserId = req.user.id;
        const currentUser = await prisma20.users.findUnique({
          where: { id: currentUserId },
          select: { is_owner: true }
        });
        if (!currentUser?.is_owner) {
          return res.status(403).json({
            error: "Acceso denegado: Solo el Owner puede transferir este rol",
            code: "NOT_OWNER"
          });
        }
        const targetUser = await prisma20.users.findUnique({
          where: { id }
        });
        if (!targetUser) {
          return res.status(404).json({ error: "Usuario destino no encontrado" });
        }
        if (targetUser.id === currentUserId) {
          return res.status(400).json({ error: "No puedes transferir el rol a ti mismo" });
        }
        await prisma20.users.update({
          where: { id: currentUserId },
          data: { is_owner: false }
        });
        const newOwner = await prisma20.users.update({
          where: { id },
          data: { is_owner: true }
        });
        await prismaStorage.createActivityLog({
          usuarioId: currentUserId,
          accion: `Transfiri\xF3 el rol de Owner a ${targetUser.username}`,
          modulo: "admin",
          detalles: `Nuevo Owner: ${targetUser.username} (${targetUser.email})`
        });
        const { password: _, ...userWithoutPassword } = newOwner;
        res.json({
          message: "Rol de Owner transferido exitosamente",
          newOwner: userWithoutPassword
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.post(
    "/api/users/:id/set-owner",
    authenticateToken2,
    checkPermission("admin:system"),
    async (req, res) => {
      try {
        const { id } = req.params;
        const currentUserId = req.user.id;
        const targetUser = await prisma20.users.findUnique({
          where: { id },
          select: { id: true, username: true, email: true, is_owner: true }
        });
        if (!targetUser) {
          return res.status(404).json({ error: "Usuario no encontrado" });
        }
        if (targetUser.is_owner) {
          return res.status(400).json({ error: "Este usuario ya es Owner" });
        }
        await prisma20.users.updateMany({
          where: { is_owner: true },
          data: { is_owner: false }
        });
        const newOwner = await prisma20.users.update({
          where: { id },
          data: { is_owner: true }
        });
        await prismaStorage.createActivityLog({
          usuarioId: currentUserId,
          accion: `Estableci\xF3 a ${targetUser.username} como Owner`,
          modulo: "admin",
          detalles: `Nuevo Owner: ${targetUser.username} (${targetUser.email})`
        });
        const { password: _, ...userWithoutPassword } = newOwner;
        res.json({
          message: "Usuario establecido como Owner exitosamente",
          owner: userWithoutPassword
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.delete(
    "/api/users/:id",
    authenticateToken2,
    checkPermission("users:delete"),
    async (req, res) => {
      try {
        const { id } = req.params;
        const user = await prismaStorage.getUser(id);
        if (!user) {
          return res.status(404).json({ error: "Usuario no encontrado" });
        }
        const userToDelete = await prisma20.users.findUnique({
          where: { id },
          select: { is_owner: true, username: true }
        });
        if (userToDelete?.is_owner) {
          return res.status(403).json({
            error: `No se puede eliminar al usuario Owner (${userToDelete.username}). Solo el Owner puede transferir su rol a otro usuario antes de poder ser eliminado.`,
            code: "CANNOT_DELETE_OWNER"
          });
        }
        const manuals = await prisma20.manuals.count({ where: { autor_id: id } });
        const activityLogs = await prisma20.activity_logs.count({ where: { usuarioId: id } });
        const auditTrails = await prisma20.audit_trail.count({ where: { usuarioId: id } });
        if (manuals > 0) {
          return res.status(409).json({
            error: `No se puede eliminar: el usuario tiene ${manuals} manual(es) asignado(s) que se borrar\xEDan permanentemente. Reasigne los manuales a otro usuario primero.`
          });
        }
        const deleted = await prismaStorage.deleteUser(id);
        if (!deleted) {
          return res.status(404).json({ error: "Usuario no encontrado" });
        }
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: `Elimin\xF3 el usuario ${user.username}`,
          modulo: "admin",
          detalles: `Se eliminaron ${activityLogs} logs de actividad y ${auditTrails} registros de auditor\xEDa`
        });
        res.json({
          message: "Usuario eliminado exitosamente",
          deletedRelations: {
            activityLogs,
            auditTrails
          }
        });
      } catch (error) {
        if (error?.code === "CANNOT_DELETE_OWNER") {
          return res.status(403).json({ error: error.message || "No se puede eliminar al Owner", code: "CANNOT_DELETE_OWNER" });
        }
        if (error?.code === "P2003") {
          return res.status(409).json({
            error: "No se puede eliminar el usuario: tiene relaciones activas con otros registros del sistema"
          });
        }
        res.status(500).json({ error: error.message });
      }
    }
  );
  logger.info("\u2705 [DIAGNOSTICO] Registrando rutas de importaci\xF3n de clientes...");
  app2.get(
    "/api/clients/import-template",
    authenticateToken2,
    checkPermission("clients:read"),
    async (req, res) => {
      try {
        logger.info("Generando plantilla de importaci\xF3n de clientes");
        const buffer = await generateClientsTemplate();
        logger.info({ bufferSize: buffer.length }, "Plantilla generada exitosamente");
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", 'attachment; filename="plantilla-importacion-clientes.xlsx"');
        res.setHeader("Content-Length", buffer.length.toString());
        res.send(buffer);
      } catch (error) {
        logger.error({ err: error }, "Error generando plantilla de clientes");
        res.status(500).json({ error: "Error generando la plantilla", details: error?.message });
      }
    }
  );
  app2.post(
    "/api/clients/import-excel",
    authenticateToken2,
    checkPermission("clients:create"),
    uploadExcel.single("file"),
    async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: "No se proporcion\xF3 ning\xFAn archivo" });
        }
        logger.info("Iniciando importaci\xF3n de clientes desde Excel");
        const userId = req.user?.id || "system";
        const result = await processClientsImport(req.file.buffer, userId);
        if (!result.success && result.errors.length > 0) {
          return res.status(400).json({
            error: "Errores durante la importaci\xF3n",
            result
          });
        }
        await prismaStorage.createActivityLog({
          usuarioId: userId,
          accion: `Import\xF3 ${result.imported + result.updated} clientes desde Excel`,
          modulo: "clientes",
          detalles: `Nuevos: ${result.imported}, Actualizados: ${result.updated}`
        });
        res.json({
          message: "Importaci\xF3n completada",
          result
        });
      } catch (error) {
        logger.error({ err: error }, "Error en importaci\xF3n de clientes Excel");
        res.status(500).json({
          error: "Error procesando el archivo Excel",
          details: error?.message
        });
      }
    }
  );
  app2.get("/api/clients", authenticateToken2, async (req, res) => {
    try {
      const clients = await prismaStorage.getAllClients();
      res.json(clients);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.get(
    "/api/clients/:id",
    authenticateToken2,
    async (req, res) => {
      try {
        const client = await prismaStorage.getClient(req.params.id);
        if (!client) {
          return res.status(404).json({ error: "Cliente no encontrado" });
        }
        res.json(client);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.post(
    "/api/clients",
    authenticateToken2,
    checkPermission("clients:create"),
    validateZod(clientCreateSchema),
    async (req, res) => {
      try {
        const client = await prismaStorage.createClient(req.body);
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: `Cre\xF3 el cliente ${client.razonSocial}`,
          modulo: "clientes",
          detalles: `NIF/CIF: ${client.nifCif}`
        });
        await createAudit(
          req.user.id,
          "CREATE",
          "clients",
          client.id,
          null,
          client
        );
        notifyClientChange("created", client);
        res.json(client);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.patch(
    "/api/clients/:id",
    authenticateToken2,
    checkPermission("clients:update"),
    validateZod(clientUpdateSchema),
    async (req, res) => {
      try {
        const { id } = req.params;
        const oldClient = await prismaStorage.getClient(id);
        const client = await prismaStorage.updateClient(id, req.body);
        if (!client) {
          return res.status(404).json({ error: "Cliente no encontrado" });
        }
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: `Actualiz\xF3 el cliente ${client.razonSocial}`,
          modulo: "clientes",
          detalles: null
        });
        await createAudit(
          req.user.id,
          "UPDATE",
          "clients",
          client.id,
          oldClient,
          client
        );
        notifyClientChange("updated", client);
        res.json(client);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.delete(
    "/api/clients/:id",
    authenticateToken2,
    checkPermission("clients:delete"),
    async (req, res) => {
      try {
        const { id } = req.params;
        const client = await prismaStorage.getClient(id);
        if (!client) {
          return res.status(404).json({ error: "Cliente no encontrado" });
        }
        const clientTaxModels = await prisma20.client_tax_models.findMany({
          where: { client_id: id }
        });
        const filingCount = await prisma20.client_tax_filings.count({
          where: { clientId: id }
        });
        if (clientTaxModels.length > 0 || filingCount > 0) {
          const updated = await prismaStorage.updateClient(id, { isActive: false });
          await prismaStorage.createActivityLog({
            usuarioId: req.user.id,
            accion: `Desactiv\xF3 el cliente ${client.razonSocial}`,
            modulo: "clientes",
            detalles: `Cliente con ${clientTaxModels.length} modelos fiscales y ${filingCount} presentaciones asociadas`
          });
          await createAudit(
            req.user.id,
            "UPDATE",
            "clients",
            id,
            client,
            updated
          );
          res.json({
            message: "Cliente desactivado (posee impuestos o asignaciones fiscales)",
            softDelete: true,
            client: updated
          });
        } else {
          const deleted = await prismaStorage.deleteClient(id);
          if (!deleted) {
            return res.status(404).json({ error: "Error al eliminar cliente" });
          }
          await prismaStorage.createActivityLog({
            usuarioId: req.user.id,
            accion: `Elimin\xF3 permanentemente el cliente ${client.razonSocial}`,
            modulo: "clientes",
            detalles: "Sin impuestos asociados"
          });
          await createAudit(
            req.user.id,
            "DELETE",
            "clients",
            id,
            client,
            null
          );
          res.json({
            message: "Cliente eliminado permanentemente",
            hardDelete: true
          });
        }
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  const handleGetTaxConfigs = async (_req, res) => {
    try {
      const configs = await prismaStorage.getActiveTaxModelsConfig();
      res.json(configs);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };
  app2.get(
    "/api/tax-models-config",
    authenticateToken2,
    checkPermission("taxes:read"),
    handleGetTaxConfigs
  );
  app2.get(
    "/api/tax/config",
    authenticateToken2,
    checkPermission("taxes:read"),
    handleGetTaxConfigs
  );
  app2.get(
    "/api/tax/assignments",
    authenticateToken2,
    checkPermission("taxes:read"),
    async (req, res) => {
      try {
        const clientId = req.query.clientId;
        if (!clientId) {
          return res.status(400).json({ error: "clientId es requerido" });
        }
        const assignments = await prismaStorage.getClientTaxAssignments(clientId);
        res.json(assignments);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.get(
    "/api/tax-assignments/:assignmentId/history",
    authenticateToken2,
    checkPermission("taxes:read"),
    async (req, res) => {
      try {
        const { assignmentId } = req.params;
        const history = await prismaStorage.getTaxAssignmentHistory(assignmentId);
        res.json(history);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.post(
    "/api/clients/:id/tax-assignments",
    authenticateToken2,
    checkPermission("clients:update"),
    validateZod(taxAssignmentCreateSchema),
    async (req, res) => {
      try {
        const clientId = req.params.id;
        const client = await prismaStorage.getClient(clientId);
        if (!client) {
          return res.status(404).json({ error: "Cliente no encontrado" });
        }
        const taxModelCode = String(req.body.taxModelCode).toUpperCase();
        const periodicity = String(req.body.periodicity).toUpperCase();
        const clientType = String(client.tipo || "").toUpperCase();
        validateTaxAssignmentAgainstRules(clientType, {
          taxModelCode,
          periodicity
        });
        const startDate = new Date(req.body.startDate);
        const endDate = req.body.endDate ? new Date(req.body.endDate) : null;
        const activeFlag = endDate ? false : req.body.activeFlag ?? true;
        const existing = await prismaStorage.findClientTaxAssignmentByCode(clientId, taxModelCode);
        if (existing) {
          const existingEnd = existing.endDate ? new Date(existing.endDate) : null;
          const overlaps = !existingEnd || existingEnd >= startDate;
          if (overlaps) {
            return res.status(409).json({ error: `El modelo ${taxModelCode} ya est\xE1 asignado y vigente o solapa con la nueva fecha de alta` });
          }
        }
        const assignment = await prismaStorage.createClientTaxAssignment(clientId, {
          taxModelCode,
          periodicity,
          startDate,
          endDate,
          activeFlag,
          notes: req.body.notes ?? null
        });
        try {
          console.log("DEBUG: createClientTaxAssignment payload for client", clientId, {
            taxModelCode,
            periodicity,
            startDate,
            endDate,
            activeFlag,
            notes: req.body.notes ?? null
          });
          console.log("DEBUG: createClientTaxAssignment returned", assignment && typeof assignment === "object" ? JSON.stringify(assignment) : assignment);
        } catch (e) {
          console.error("DEBUG: error logging assignment debug info", e);
        }
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: `Asign\xF3 modelo ${taxModelCode} al cliente ${client.razonSocial}`,
          modulo: "clientes",
          detalles: `Periodicidad: ${periodicity}, Activo: ${assignment.effectiveActive ? "S\xED" : "No"}`
        });
        await createAudit(
          req.user.id,
          "CREATE",
          "client_tax_assignments",
          assignment.id,
          null,
          assignment
        );
        notifyTaxChange("created", assignment);
        res.status(201).json(assignment);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.patch(
    "/api/tax-assignments/:assignmentId",
    authenticateToken2,
    checkPermission("clients:update"),
    validateZod(taxAssignmentUpdateSchema),
    async (req, res) => {
      try {
        const { assignmentId } = req.params;
        const existing = await prismaStorage.getClientTaxAssignment(assignmentId);
        if (!existing) {
          return res.status(404).json({ error: "Asignaci\xF3n no encontrada" });
        }
        const client = await prismaStorage.getClient(existing.clientId);
        if (!client) {
          return res.status(404).json({ error: "Cliente asociado no encontrado" });
        }
        const taxModelCode = req.body.taxModelCode ? String(req.body.taxModelCode).toUpperCase() : existing.taxModelCode;
        const periodicity = req.body.periodicity ? String(req.body.periodicity).toUpperCase() : existing.periodicity;
        const clientType = String(client.tipo || "").toUpperCase();
        validateTaxAssignmentAgainstRules(clientType, {
          taxModelCode,
          periodicity
        });
        if (taxModelCode !== existing.taxModelCode) {
          const duplicate = await prismaStorage.findClientTaxAssignmentByCode(existing.clientId, taxModelCode);
          if (duplicate && duplicate.id !== assignmentId) {
            return res.status(409).json({ error: `El modelo ${taxModelCode} ya est\xE1 asignado al cliente` });
          }
        }
        let endDate;
        if (Object.prototype.hasOwnProperty.call(req.body, "endDate")) {
          if (req.body.endDate === null || req.body.endDate === void 0) {
            endDate = null;
          } else {
            endDate = new Date(req.body.endDate);
          }
        }
        const startDate = req.body.startDate !== void 0 ? new Date(req.body.startDate) : void 0;
        const activeFlag = endDate && endDate !== null ? false : req.body.activeFlag !== void 0 ? req.body.activeFlag : void 0;
        const updated = await prismaStorage.updateClientTaxAssignment(assignmentId, {
          taxModelCode,
          periodicity,
          startDate,
          endDate: endDate ?? void 0,
          activeFlag: activeFlag ?? void 0,
          notes: Object.prototype.hasOwnProperty.call(req.body, "notes") ? req.body.notes ?? null : void 0
        });
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: `Actualiz\xF3 modelo ${taxModelCode} del cliente ${client.razonSocial}`,
          modulo: "clientes",
          detalles: `Activo: ${updated.effectiveActive ? "S\xED" : "No"}`
        });
        await createAudit(
          req.user.id,
          "UPDATE",
          "client_tax_assignments",
          assignmentId,
          existing,
          updated
        );
        notifyTaxChange("updated", updated);
        res.json(updated);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.delete(
    "/api/tax-assignments/:assignmentId",
    authenticateToken2,
    checkPermission("clients:update"),
    async (req, res) => {
      try {
        const { assignmentId } = req.params;
        const hardDelete = req.query.hard === "1" || req.query.hard === "true";
        const existing = await prismaStorage.getClientTaxAssignment(assignmentId);
        if (!existing) {
          return res.status(404).json({ error: "Asignaci\xF3n no encontrada" });
        }
        const hasHistory = await prismaStorage.hasAssignmentHistoricFilings(
          existing.clientId,
          existing.taxModelCode
        );
        let result;
        let message;
        let action = "DELETE";
        if (hardDelete) {
          result = await prismaStorage.deleteClientTaxAssignment(assignmentId);
          message = hasHistory ? "Asignaci\xF3n eliminada definitivamente (incluyendo hist\xF3rico)." : "Asignaci\xF3n eliminada correctamente.";
          action = "DELETE";
        } else if (hasHistory) {
          result = await prismaStorage.softDeactivateClientTaxAssignment(assignmentId, /* @__PURE__ */ new Date());
          message = "Asignaci\xF3n desactivada. Posee hist\xF3rico de presentaciones.";
          action = "UPDATE";
        } else {
          result = await prismaStorage.deleteClientTaxAssignment(assignmentId);
          message = "Asignaci\xF3n eliminada correctamente.";
          action = "DELETE";
        }
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: action === "DELETE" ? `Elimin\xF3 modelo ${existing.taxModelCode} del cliente` : `Desactiv\xF3 modelo ${existing.taxModelCode} del cliente`,
          modulo: "clientes",
          detalles: message
        });
        await createAudit(
          req.user.id,
          action,
          "client_tax_assignments",
          assignmentId,
          existing,
          action === "DELETE" ? null : result
        );
        notifyTaxChange(action === "DELETE" ? "deleted" : "updated", result);
        res.json({
          assignment: result,
          softDeleted: hasHistory,
          message
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.patch(
    "/api/clients/:id/toggle-active",
    authenticateToken2,
    checkPermission("clients:update"),
    async (req, res) => {
      try {
        const { id } = req.params;
        const client = await prismaStorage.getClient(id);
        if (!client) {
          return res.status(404).json({ error: "Cliente no encontrado" });
        }
        const newActiveState = !client.isActive;
        const updatedClient = await prismaStorage.updateClient(id, { isActive: newActiveState });
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: newActiveState ? `Activ\xF3 el cliente ${client.razonSocial}` : `Desactiv\xF3 el cliente ${client.razonSocial}`,
          modulo: "clientes",
          detalles: `Estado cambiado a: ${newActiveState ? "Activo" : "Inactivo"}`
        });
        await createAudit(
          req.user.id,
          "UPDATE",
          "clients",
          id,
          client,
          updatedClient
        );
        res.json(updatedClient);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.put(
    "/api/clients/:id/employees",
    authenticateToken2,
    checkPermission("clients:update"),
    async (req, res) => {
      try {
        const { id } = req.params;
        const { employeeIds, primaryEmployeeId } = req.body;
        const client = await prismaStorage.getClient(id);
        if (!client) {
          return res.status(404).json({ error: "Cliente no encontrado" });
        }
        await prisma20.client_employees.deleteMany({
          where: { clientId: id }
        });
        if (employeeIds && Array.isArray(employeeIds) && employeeIds.length > 0) {
          await prisma20.client_employees.createMany({
            data: employeeIds.map((userId) => ({
              clientId: id,
              userId,
              is_primary: userId === primaryEmployeeId
            }))
          });
          if (primaryEmployeeId) {
            await prismaStorage.updateClient(id, { responsableAsignado: primaryEmployeeId });
          }
        } else {
          await prismaStorage.updateClient(id, { responsableAsignado: null });
        }
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: `Actualiz\xF3 empleados del cliente ${client.razonSocial}`,
          modulo: "clientes",
          detalles: `${employeeIds?.length || 0} empleados asignados`
        });
        const updatedClient = await prismaStorage.getClient(id);
        res.json(updatedClient);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.post(
    "/api/clients/:id/employees/:userId",
    authenticateToken2,
    checkPermission("clients:update"),
    async (req, res) => {
      try {
        const { id, userId } = req.params;
        const { isPrimary } = req.body;
        const client = await prismaStorage.getClient(id);
        if (!client) {
          return res.status(404).json({ error: "Cliente no encontrado" });
        }
        const user = await prismaStorage.getUser(userId);
        if (!user) {
          return res.status(404).json({ error: "Usuario no encontrado" });
        }
        if (isPrimary) {
          await prisma20.client_employees.updateMany({
            where: { clientId: id },
            data: { is_primary: false }
          });
        }
        await prisma20.client_employees.upsert({
          where: {
            clientId_userId: {
              clientId: id,
              userId
            }
          },
          create: {
            clientId: id,
            userId,
            is_primary: isPrimary || false
          },
          update: {
            is_primary: isPrimary || false
          }
        });
        if (isPrimary) {
          await prismaStorage.updateClient(id, { responsableAsignado: userId });
        } else {
          const primaryEmployee = await prisma20.client_employees.findFirst({
            where: { clientId: id, is_primary: true }
          });
          await prismaStorage.updateClient(id, {
            responsableAsignado: primaryEmployee ? primaryEmployee.userId : null
          });
        }
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: `Asign\xF3 empleado ${user.username} al cliente ${client.razonSocial}`,
          modulo: "clientes",
          detalles: isPrimary ? "Como responsable principal" : "Como colaborador"
        });
        const updatedClient = await prismaStorage.getClient(id);
        res.json(updatedClient);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.delete(
    "/api/clients/:id/employees/:userId",
    authenticateToken2,
    checkPermission("clients:update"),
    async (req, res) => {
      try {
        const { id, userId } = req.params;
        const client = await prismaStorage.getClient(id);
        if (!client) {
          return res.status(404).json({ error: "Cliente no encontrado" });
        }
        const user = await prismaStorage.getUser(userId);
        const employeeToDelete = await prisma20.client_employees.findUnique({
          where: {
            clientId_userId: {
              clientId: id,
              userId
            }
          }
        });
        await prisma20.client_employees.delete({
          where: {
            clientId_userId: {
              clientId: id,
              userId
            }
          }
        });
        if (employeeToDelete?.is_primary) {
          const remainingEmployee = await prisma20.client_employees.findFirst({
            where: { clientId: id }
          });
          if (remainingEmployee) {
            await prisma20.client_employees.update({
              where: {
                clientId_userId: {
                  clientId: id,
                  userId: remainingEmployee.userId
                }
              },
              data: { is_primary: true }
            });
            await prismaStorage.updateClient(id, { responsableAsignado: remainingEmployee.userId });
          } else {
            await prismaStorage.updateClient(id, { responsableAsignado: null });
          }
        }
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: `Desasign\xF3 empleado ${user?.username || userId} del cliente ${client.razonSocial}`,
          modulo: "clientes"
        });
        const updatedClient = await prismaStorage.getClient(id);
        res.json(updatedClient);
      } catch (error) {
        if (error.code === "P2025") {
          return res.status(404).json({ error: "Asignaci\xF3n no encontrada" });
        }
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.get(
    "/api/impuestos",
    authenticateToken2,
    async (req, res) => {
      try {
        const impuestos = await prismaStorage.getAllImpuestos();
        res.json(impuestos);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.post(
    "/api/impuestos",
    authenticateToken2,
    checkPermission("taxes:create"),
    async (req, res) => {
      try {
        const { modelo, nombre, descripcion } = req.body;
        if (!modelo || !nombre) {
          return res.status(400).json({ error: "Modelo y nombre son requeridos" });
        }
        const impuesto = await prismaStorage.createImpuesto({ modelo, nombre, descripcion });
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: `Cre\xF3 el impuesto: ${modelo} - ${nombre}`,
          modulo: "impuestos",
          detalles: descripcion || ""
        });
        res.status(201).json(impuesto);
      } catch (error) {
        if (error.code === "P2002") {
          return res.status(400).json({ error: "Ya existe un impuesto con ese modelo" });
        }
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.patch(
    "/api/impuestos/:id",
    authenticateToken2,
    checkPermission("taxes:update"),
    async (req, res) => {
      try {
        const { modelo, nombre, descripcion } = req.body;
        const impuesto = await prismaStorage.updateImpuesto(req.params.id, { modelo, nombre, descripcion });
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: `Actualiz\xF3 el impuesto: ${impuesto.modelo}`,
          modulo: "impuestos",
          detalles: JSON.stringify({ modelo, nombre, descripcion })
        });
        res.json(impuesto);
      } catch (error) {
        if (error.code === "P2002") {
          return res.status(400).json({ error: "Ya existe un impuesto con ese modelo" });
        }
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.delete(
    "/api/impuestos/:id",
    authenticateToken2,
    checkPermission("taxes:delete"),
    async (req, res) => {
      try {
        await prismaStorage.deleteImpuesto(req.params.id);
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: `Elimin\xF3 un impuesto`,
          modulo: "impuestos",
          detalles: `ID: ${req.params.id}`
        });
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.get(
    "/api/obligaciones-fiscales",
    authenticateToken2,
    async (req, res) => {
      try {
        const obligaciones = await prismaStorage.getAllObligacionesFiscales();
        res.json(obligaciones);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.get(
    "/api/obligaciones-fiscales/cliente/:clienteId",
    authenticateToken2,
    async (req, res) => {
      try {
        const obligaciones = await prismaStorage.getObligacionesByCliente(req.params.clienteId);
        res.json(obligaciones);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.post(
    "/api/obligaciones-fiscales",
    authenticateToken2,
    checkPermission("taxes:create"),
    async (req, res) => {
      try {
        const { clienteId, impuestoId, periodicidad, diaVencimiento, observaciones, fechaInicio, fechaFin, activo } = req.body;
        if (!clienteId || !impuestoId || !periodicidad || !fechaInicio) {
          return res.status(400).json({ error: "Cliente, impuesto, periodicidad y fecha de inicio son requeridos" });
        }
        const obligacion = await prismaStorage.createObligacionFiscal({
          clienteId,
          impuestoId,
          periodicidad,
          diaVencimiento: diaVencimiento || null,
          observaciones: observaciones || null,
          fechaInicio: new Date(fechaInicio),
          fechaFin: fechaFin ? new Date(fechaFin) : null,
          activo: activo !== void 0 ? activo : true,
          fechaAsignacion: /* @__PURE__ */ new Date()
        });
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: `Cre\xF3 obligaci\xF3n fiscal para cliente`,
          modulo: "impuestos",
          detalles: `Cliente: ${clienteId}, Impuesto: ${impuestoId}`
        });
        res.status(201).json(obligacion);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.patch(
    "/api/obligaciones-fiscales/:id",
    authenticateToken2,
    checkPermission("taxes:update"),
    async (req, res) => {
      try {
        const updateData = { ...req.body };
        if (updateData.fechaInicio && typeof updateData.fechaInicio === "string") {
          updateData.fechaInicio = new Date(updateData.fechaInicio);
        }
        if (updateData.fechaFin && typeof updateData.fechaFin === "string") {
          updateData.fechaFin = new Date(updateData.fechaFin);
        }
        const obligacion = await prismaStorage.updateObligacionFiscal(req.params.id, updateData);
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: `Actualiz\xF3 obligaci\xF3n fiscal`,
          modulo: "impuestos",
          detalles: `ID: ${req.params.id}`
        });
        res.json(obligacion);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.delete(
    "/api/obligaciones-fiscales/:id",
    authenticateToken2,
    checkPermission("taxes:delete"),
    async (req, res) => {
      try {
        await prismaStorage.deleteObligacionFiscal(req.params.id);
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: `Elimin\xF3 obligaci\xF3n fiscal`,
          modulo: "impuestos",
          detalles: `ID: ${req.params.id}`
        });
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.get("/api/tasks", authenticateToken2, async (req, res) => {
    try {
      const tasks = await prismaStorage.getAllTasks();
      const clients = await prismaStorage.getAllClients();
      const users = await prismaStorage.getAllUsers();
      const enriched = tasks.map((task) => ({
        ...task,
        client: clients.find((c) => c.id === task.clienteId),
        assignedUser: users.find((u) => u.id === task.asignadoA)
      }));
      res.json(enriched);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post(
    "/api/tasks",
    authenticateToken2,
    checkPermission("tasks:create"),
    validateZod(taskCreateSchema),
    async (req, res) => {
      try {
        const taskData = { ...req.body };
        if (taskData.fechaVencimiento && /^\d{4}-\d{2}-\d{2}$/.test(taskData.fechaVencimiento)) {
          taskData.fechaVencimiento = (/* @__PURE__ */ new Date(taskData.fechaVencimiento + "T00:00:00.000Z")).toISOString();
        }
        if (!taskData.asignadoA || taskData.asignadoA === "") {
          delete taskData.asignadoA;
        }
        if (!taskData.clienteId || taskData.clienteId === "") {
          delete taskData.clienteId;
        }
        const task = await prismaStorage.createTask(taskData);
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: `Cre\xF3 la tarea "${task.titulo}"`,
          modulo: "tareas",
          detalles: null
        });
        notifyTaskChange("created", task, task.asignadoA || void 0);
        res.json(task);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.patch(
    "/api/tasks/:id",
    authenticateToken2,
    async (req, res) => {
      try {
        const { id } = req.params;
        const taskData = { ...req.body };
        if (taskData.fechaVencimiento && /^\d{4}-\d{2}-\d{2}$/.test(taskData.fechaVencimiento)) {
          taskData.fechaVencimiento = (/* @__PURE__ */ new Date(taskData.fechaVencimiento + "T00:00:00.000Z")).toISOString();
        }
        if (!taskData.asignadoA || taskData.asignadoA === "") {
          delete taskData.asignadoA;
        }
        if (!taskData.clienteId || taskData.clienteId === "") {
          delete taskData.clienteId;
        }
        const task = await prismaStorage.updateTask(id, taskData);
        if (!task) {
          return res.status(404).json({ error: "Tarea no encontrada" });
        }
        notifyTaskChange("updated", task, task.asignadoA || void 0);
        res.json(task);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.get("/api/manuals", authenticateToken2, async (req, res) => {
    try {
      const manuals = await prismaStorage.getAllManuals();
      res.json(manuals);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/manuals/:id", authenticateToken2, async (req, res) => {
    try {
      const { id } = req.params;
      const manual = await prismaStorage.getManual(id);
      if (!manual) {
        return res.status(404).json({ error: "Manual no encontrado" });
      }
      res.json(manual);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post(
    "/api/manuals",
    authenticateToken2,
    checkPermission("manuals:create"),
    async (req, res) => {
      try {
        const manual = await prismaStorage.createManual({
          ...req.body,
          autorId: req.user.id
        });
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: `Cre\xF3 el manual "${manual.titulo}"`,
          modulo: "manuales",
          detalles: null
        });
        res.json(manual);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.patch(
    "/api/manuals/:id",
    authenticateToken2,
    checkPermission("manuals:update"),
    async (req, res) => {
      try {
        const { id } = req.params;
        const currentManual = await prismaStorage.getManual(id);
        if (currentManual && req.body.createVersion) {
          const nextVersion = await prismaStorage.getNextVersionNumber(id);
          await prismaStorage.createManualVersion({
            manualId: id,
            versionNumber: nextVersion,
            titulo: currentManual.titulo,
            contenidoHtml: currentManual.contenidoHtml,
            etiquetas: currentManual.etiquetas || null,
            categoria: currentManual.categoria || null,
            createdBy: req.user.id
          });
        }
        const manual = await prismaStorage.updateManual(id, req.body);
        if (!manual) {
          return res.status(404).json({ error: "Manual no encontrado" });
        }
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: `Actualiz\xF3 el manual "${manual.titulo}"`,
          modulo: "manuales",
          detalles: null
        });
        res.json(manual);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.delete(
    "/api/manuals/:id",
    authenticateToken2,
    checkPermission("manuals:update"),
    async (req, res) => {
      const { id } = req.params;
      try {
        const ok = await prismaStorage.deleteManual(id);
        if (!ok) {
          return res.status(404).json({ error: "Manual no encontrado" });
        }
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: `Elimin\xF3 un manual`,
          modulo: "manuales",
          detalles: `ID: ${id}`
        });
        res.status(204).end();
      } catch (error) {
        res.status(500).json({ error: error.message || "No se pudo eliminar" });
      }
    }
  );
  app2.post(
    "/api/manuals/upload-image",
    authenticateToken2,
    checkPermission("manuals:update"),
    uploadManualImage.single("image"),
    uploadToStorage,
    async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: "No se proporcion\xF3 imagen" });
        }
        const imageUrl = `/uploads/manuals/images/${req.file.filename}`;
        res.json({ url: imageUrl });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.post(
    "/api/manuals/:id/attachments",
    authenticateToken2,
    checkPermission("manuals:update"),
    uploadManualAttachment.single("file"),
    uploadToStorage,
    async (req, res) => {
      try {
        const { id } = req.params;
        if (!req.file) {
          return res.status(400).json({ error: "No se proporcion\xF3 archivo" });
        }
        const manual = await prismaStorage.getManual(id);
        if (!manual) {
          return res.status(404).json({ error: "Manual no encontrado" });
        }
        const attachment = await prismaStorage.createManualAttachment({
          manualId: id,
          fileName: req.file.filename,
          originalName: req.file.originalname,
          filePath: req.file.path,
          fileType: path13.extname(req.file.originalname).toLowerCase(),
          fileSize: req.file.size,
          uploadedBy: req.user.id
        });
        res.json(attachment);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.get(
    "/api/manuals/:id/attachments",
    authenticateToken2,
    async (req, res) => {
      try {
        const { id } = req.params;
        const attachments = await prismaStorage.getManualAttachments(id);
        res.json(attachments);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.delete(
    "/api/manuals/:manualId/attachments/:attachmentId",
    authenticateToken2,
    checkPermission("manuals:update"),
    async (req, res) => {
      try {
        const { attachmentId } = req.params;
        const attachment = await prismaStorage.getManualAttachment(attachmentId);
        if (!attachment) {
          return res.status(404).json({ error: "Adjunto no encontrado" });
        }
        if (fs10.existsSync(attachment.filePath)) {
          fs10.unlinkSync(attachment.filePath);
        }
        const deleted = await prismaStorage.deleteManualAttachment(attachmentId);
        if (!deleted) {
          return res.status(500).json({ error: "Error al eliminar adjunto" });
        }
        res.json({ message: "Adjunto eliminado correctamente" });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.get(
    "/api/manuals/:id/versions",
    authenticateToken2,
    async (req, res) => {
      try {
        const { id } = req.params;
        const versions = await prismaStorage.getManualVersions(id);
        res.json(versions);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.post(
    "/api/manuals/:id/versions/restore/:versionId",
    authenticateToken2,
    checkPermission("manuals:update"),
    async (req, res) => {
      try {
        const { id, versionId } = req.params;
        const manual = await prismaStorage.restoreManualVersion(id, versionId);
        if (!manual) {
          return res.status(404).json({ error: "No se pudo restaurar la versi\xF3n" });
        }
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: `Restaur\xF3 versi\xF3n del manual "${manual.titulo}"`,
          modulo: "manuales",
          detalles: `Versi\xF3n ID: ${versionId}`
        });
        res.json(manual);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.get(
    "/api/activity-logs",
    authenticateToken2,
    checkPermission("audits:read"),
    async (req, res) => {
      try {
        const logs = await prismaStorage.getAllActivityLogs();
        const users = await prismaStorage.getAllUsers();
        const enriched = logs.map((log2) => ({
          ...log2,
          user: users.find((u) => u.id === log2.usuarioId)
        }));
        res.json(enriched);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.get("/api/dashboard/stats", authenticateToken2, async (req, res) => {
    try {
      const clients = await prismaStorage.getAllClients();
      const tasks = await prismaStorage.getAllTasks();
      const manuals = await prismaStorage.getAllManuals();
      const stats = {
        totalClientes: clients.length,
        clientesActivos: clients.filter((c) => c.responsableAsignado).length,
        tareasGenerales: tasks.filter((t) => t.visibilidad === "GENERAL").length,
        tareasPersonales: tasks.filter((t) => t.visibilidad === "PERSONAL").length,
        tareasPendientes: tasks.filter((t) => t.estado === "PENDIENTE").length,
        tareasEnProgreso: tasks.filter((t) => t.estado === "EN_PROGRESO").length,
        tareasCompletadas: tasks.filter((t) => t.estado === "COMPLETADA").length,
        manualesPublicados: manuals.filter((m) => m.publicado).length,
        manualesTotal: manuals.length
      };
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post(
    "/api/admin/smtp-config",
    authenticateToken2,
    checkPermission("admin:settings"),
    validateZod(smtpConfigSchema),
    async (req, res) => {
      try {
        const { host, port, user, pass } = req.body;
        if (!host || !port || !user || !pass) {
          return res.status(400).json({ error: "Faltan par\xE1metros de configuraci\xF3n SMTP" });
        }
        if (typeof host !== "string" || host.length > 200) {
          return res.status(400).json({ error: "Host SMTP inv\xE1lido" });
        }
        const hostPattern = /^[a-zA-Z0-9._:-]+$/;
        if (!hostPattern.test(host)) {
          return res.status(400).json({ error: "Host SMTP inv\xE1lido" });
        }
        const portNum = parseInt(String(port), 10);
        if (Number.isNaN(portNum) || portNum <= 0 || portNum > 65535) {
          return res.status(400).json({ error: "Puerto SMTP inv\xE1lido" });
        }
        configureSMTP({ host, port: portNum, user, pass });
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: "Configur\xF3 los par\xE1metros SMTP",
          modulo: "admin",
          detalles: `Host: ${host}, Puerto: ${port}`
        });
        res.json({ success: true, message: "Configuraci\xF3n SMTP guardada exitosamente" });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.get(
    "/api/admin/smtp-config",
    authenticateToken2,
    checkPermission("admin:settings"),
    async (req, res) => {
      try {
        const config = getSMTPConfig();
        if (!config) {
          return res.json({ configured: false });
        }
        res.json({
          configured: true,
          host: config.host,
          port: config.port,
          user: config.user
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.get("/api/admin/online-count", authenticateToken2, async (req, res) => {
    try {
      const count = await prisma20.sessions.count({
        where: { ended_at: null }
      });
      res.json({ count });
    } catch (error) {
      console.error("Error getting online count:", error);
      res.status(500).json({ error: error.message });
    }
  });
  app2.use("/api/admin/sessions", admin_sessions_default);
  app2.use("/api/price-catalog", price_catalog_default);
  app2.use("/api/budgets", budgets_default);
  app2.use("/public/budgets", public_budgets_default);
  app2.use("/api/gestoria-budgets", gestoria_budgets_default);
  app2.use("/api/budget-parameters", budget_parameters_default);
  app2.use("/api/budget-templates", budget_templates_default);
  app2.use("/api/documents", documents_routes_default);
  app2.use("/api/tax-calendar", tax_calendar_routes_default);
  app2.use("/api/client-tax", client_tax_routes_default);
  app2.use("/api/tax-obligations", tax_obligations_routes_default);
  app2.use("/api/system/github", github_updates_routes_default);
  app2.get(
    "/api/admin/smtp-accounts",
    authenticateToken2,
    checkPermission("admin:smtp_manage"),
    async (req, res) => {
      try {
        const accounts = await prismaStorage.getAllSMTPAccounts();
        const accountsWithoutPassword = accounts.map((acc) => ({
          ...acc,
          password: void 0
        }));
        res.json(accountsWithoutPassword);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.post(
    "/api/admin/smtp-accounts",
    authenticateToken2,
    checkPermission("admin:smtp_manage"),
    validateZod(smtpAccountSchema),
    async (req, res) => {
      try {
        const { nombre, host, port, user, password, isPredeterminada, activa } = req.body;
        if (!nombre || !host || !port || !user || !password) {
          return res.status(400).json({ error: "Faltan par\xE1metros requeridos" });
        }
        const account = await prismaStorage.createSMTPAccount({
          nombre,
          host,
          port: parseInt(port),
          user,
          password,
          isPredeterminada: isPredeterminada || false,
          activa: activa !== void 0 ? activa : true,
          creadaPor: req.user.id
        });
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: "Cre\xF3 cuenta SMTP",
          modulo: "admin",
          detalles: `Cuenta: ${nombre} (${user})`
        });
        res.json({ ...account, password: void 0 });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.patch(
    "/api/admin/smtp-accounts/:id",
    authenticateToken2,
    checkPermission("admin:smtp_manage"),
    async (req, res) => {
      try {
        const { id } = req.params;
        const updates = req.body;
        if (updates.port) {
          updates.port = parseInt(updates.port);
        }
        const account = await prismaStorage.updateSMTPAccount(id, updates);
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: "Actualiz\xF3 cuenta SMTP",
          modulo: "admin",
          detalles: `Cuenta ID: ${id}`
        });
        res.json({ ...account, password: void 0 });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.delete(
    "/api/admin/smtp-accounts/:id",
    authenticateToken2,
    checkPermission("admin:smtp_manage"),
    async (req, res) => {
      try {
        const { id } = req.params;
        await prismaStorage.deleteSMTPAccount(id);
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: "Elimin\xF3 cuenta SMTP",
          modulo: "admin",
          detalles: `Cuenta ID: ${id}`
        });
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.post(
    "/api/admin/smtp-accounts/test",
    authenticateToken2,
    checkPermission("admin:smtp_manage"),
    async (req, res) => {
      try {
        const { host, port, user, password } = req.body;
        if (!host || !port || !user || !password) {
          return res.status(400).json({
            success: false,
            error: "Faltan par\xE1metros requeridos (host, port, user, password)"
          });
        }
        console.log(`\u{1F50D} Probando conexi\xF3n SMTP a ${host}:${port} con usuario ${user}`);
        const transportConfig = {
          host,
          port: parseInt(port),
          secure: parseInt(port) === 465,
          // true para 465, false para otros puertos
          auth: {
            user,
            pass: password
          },
          // Timeouts más largos para evitar errores prematuros
          connectionTimeout: 1e4,
          // 10 segundos
          greetingTimeout: 1e4,
          socketTimeout: 1e4
        };
        console.log("\u{1F4E7} Configuraci\xF3n SMTP:", { ...transportConfig, auth: { user, pass: "***" } });
        const transporter2 = nodemailer6.createTransport(transportConfig);
        await transporter2.verify();
        console.log("\u2705 Conexi\xF3n SMTP exitosa");
        res.json({
          success: true,
          message: "Conexi\xF3n SMTP exitosa. El servidor est\xE1 configurado correctamente."
        });
      } catch (error) {
        console.error("\u274C Error al probar conexi\xF3n SMTP:", {
          message: error.message,
          code: error.code,
          command: error.command,
          response: error.response,
          responseCode: error.responseCode
        });
        let errorMessage = error.message || "Error desconocido al conectar con el servidor SMTP";
        if (error.code === "ECONNREFUSED") {
          errorMessage = `No se pudo conectar al servidor ${req.body.host}:${req.body.port}. Verifica el host y puerto.`;
        } else if (error.code === "ENOTFOUND") {
          errorMessage = `El servidor ${req.body.host} no existe o no se puede resolver. Verifica el host.`;
        } else if (error.code === "ETIMEDOUT") {
          errorMessage = `Tiempo de espera agotado al conectar con ${req.body.host}:${req.body.port}.`;
        } else if (error.responseCode === 535 || error.message.includes("Invalid login")) {
          errorMessage = "Usuario o contrase\xF1a incorrectos.";
        } else if (error.responseCode === 454) {
          errorMessage = "Autenticaci\xF3n fallida. Verifica que las credenciales sean correctas.";
        }
        res.status(500).json({
          success: false,
          error: errorMessage,
          details: process.env.NODE_ENV === "development" ? error.message : void 0
        });
      }
    }
  );
  app2.post(
    "/api/admin/apply-migrations",
    authenticateToken2,
    checkPermission("admin:system"),
    async (req, res) => {
      try {
        console.log("\u{1F680} Iniciando migraciones...");
        const updatedUsers = await prisma20.users.updateMany({
          where: { username: "CarlosAdmin" },
          data: { is_owner: true }
        });
        const adminUser = await prisma20.users.findFirst({
          where: { username: "CarlosAdmin" },
          select: { username: true, email: true, is_owner: true }
        });
        const roles = await prisma20.roles.findMany({
          select: {
            id: true,
            name: true,
            is_system: true
          }
        });
        res.json({
          success: true,
          message: "\u2705 Migraciones aplicadas exitosamente",
          migrations: {
            usersUpdated: updatedUsers.count,
            adminUser,
            rolesCount: roles.length,
            roles
          }
        });
      } catch (error) {
        console.error("\u274C Error en migraciones:", error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    }
  );
  app2.get(
    "/api/admin/storage-config",
    authenticateToken2,
    checkPermission("admin:system"),
    async (req, res) => {
      try {
        const config = await prisma20.storage_configs.findFirst({
          where: { isActive: true },
          orderBy: { createdAt: "desc" }
        });
        if (!config) {
          return res.json({
            type: "LOCAL",
            base_path: "/uploads",
            isActive: true
          });
        }
        res.json({
          id: config.id,
          type: config.type,
          host: config.host,
          port: config.port,
          username: config.username,
          base_path: config.base_path,
          isActive: config.isActive,
          createdAt: config.createdAt,
          updatedAt: config.updatedAt
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.post(
    "/api/admin/storage-config",
    authenticateToken2,
    checkPermission("admin:system"),
    async (req, res) => {
      try {
        const { type, host, port, username, password, basePath } = req.body;
        if (!type) {
          return res.status(400).json({ error: "El tipo de almacenamiento es requerido" });
        }
        if (type === "FTP" || type === "SMB") {
          if (!host || !port || !username || !password) {
            return res.status(400).json({
              error: "Para FTP/SMB se requieren: host, port, username y password"
            });
          }
        }
        const encryptedPassword = password ? encryptPassword2(password) : null;
        await prisma20.storage_configs.updateMany({
          where: { isActive: true },
          data: { isActive: false }
        });
        const config = await prisma20.storage_configs.create({
          data: {
            id: randomUUID9(),
            type,
            name: `${type} - ${(/* @__PURE__ */ new Date()).toISOString()}`,
            host,
            port: port ? parseInt(port) : null,
            username,
            encrypted_password: encryptedPassword,
            base_path: basePath || (type === "LOCAL" ? "/uploads" : "/"),
            isActive: true
          }
        });
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: `Configur\xF3 almacenamiento ${type}`,
          modulo: "admin",
          detalles: type === "LOCAL" ? "Almacenamiento local" : `${host}:${port}`
        });
        await StorageFactory.clearInstance();
        res.json({
          id: config.id,
          type: config.type,
          host: config.host,
          port: config.port,
          username: config.username,
          base_path: config.base_path,
          isActive: config.isActive
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.post(
    "/api/admin/storage-config/test",
    authenticateToken2,
    checkPermission("admin:system"),
    async (req, res) => {
      try {
        const { type, host, port, username, password, basePath } = req.body;
        if (!type) {
          return res.status(400).json({ error: "El tipo de almacenamiento es requerido" });
        }
        if (type === "FTP" || type === "SMB") {
          if (!host || !port || !username || !password) {
            return res.status(400).json({
              error: "Para FTP/SMB se requieren: host, port, username y password"
            });
          }
        }
        const config = {
          type,
          host,
          port: port ? parseInt(port) : void 0,
          username,
          encryptedPassword: password ? encryptPassword2(password) : null,
          base_path: basePath || (type === "LOCAL" ? "/uploads" : "/")
        };
        const result = await StorageFactory.testConfigurationData(config);
        if (result.success) {
          res.json({
            success: true,
            message: `Conexi\xF3n ${type} exitosa`,
            details: result.message
          });
        } else {
          res.status(400).json({
            success: false,
            error: result.message
          });
        }
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    }
  );
  app2.post(
    "/api/admin/storage-config/migrate",
    authenticateToken2,
    checkPermission("admin:system"),
    async (req, res) => {
      try {
        const { targetConfigId } = req.body;
        if (!targetConfigId) {
          return res.status(400).json({
            error: "Se requiere targetConfigId"
          });
        }
        const { migrateStorage } = await import("./services/migration-service");
        const result = await migrateStorage(targetConfigId);
        res.json({
          success: result.success,
          totalFiles: result.totalFiles,
          migratedFiles: result.migratedFiles,
          errors: result.errors,
          message: result.success ? `Migraci\xF3n exitosa: ${result.migratedFiles} archivos migrados` : `Migraci\xF3n con errores: ${result.migratedFiles}/${result.totalFiles} archivos migrados`
        });
      } catch (error) {
        res.status(500).json({
          error: error.message,
          success: false
        });
      }
    }
  );
  app2.get(
    "/api/admin/system-settings",
    async (req, res) => {
      try {
        const settings = await prismaStorage.getSystemSettings();
        if (!settings) {
          return res.json({ registrationEnabled: true });
        }
        res.json(settings);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.patch(
    "/api/admin/system-settings",
    authenticateToken2,
    checkPermission("admin:settings"),
    async (req, res) => {
      try {
        const { registrationEnabled } = req.body;
        const settings = await prismaStorage.updateSystemSettings({
          registrationEnabled
        });
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: registrationEnabled ? "Habilit\xF3 el registro de usuarios" : "Deshabilit\xF3 el registro de usuarios",
          modulo: "admin",
          detalles: `Registro de usuarios: ${registrationEnabled ? "Habilitado" : "Deshabilitado"}`
        });
        res.json(settings);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.get(
    "/api/system/config",
    authenticateToken2,
    checkPermission("admin:settings"),
    async (req, res) => {
      try {
        const configs = await prisma20.system_config.findMany({
          orderBy: { key: "asc" }
        });
        res.json(configs);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.get(
    "/api/system/config/:key",
    authenticateToken2,
    checkPermission("admin:settings"),
    async (req, res) => {
      try {
        const config = await prisma20.system_config.findUnique({
          where: { key: req.params.key }
        });
        if (!config) {
          return res.status(404).json({ error: "Configuraci\xF3n no encontrada" });
        }
        res.json(config);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.put(
    "/api/system/config/:key",
    authenticateToken2,
    checkPermission("admin:settings"),
    async (req, res) => {
      try {
        const { value } = req.body;
        if (value === void 0 || value === null) {
          return res.status(400).json({ error: "El valor de la configuraci\xF3n es requerido" });
        }
        const existing = await prisma20.system_config.findUnique({
          where: { key: req.params.key }
        });
        if (!existing) {
          return res.status(404).json({ error: "Configuraci\xF3n no encontrada" });
        }
        if (!existing.is_editable) {
          return res.status(403).json({ error: "Esta configuraci\xF3n no es editable" });
        }
        const config = await prisma20.system_config.update({
          where: { key: req.params.key },
          data: { value: String(value) }
        });
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: `Actualiz\xF3 configuraci\xF3n del sistema`,
          modulo: "admin",
          detalles: `Configuraci\xF3n "${req.params.key}" actualizada a: ${value}`
        });
        res.json(config);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.get(
    "/api/admin/github-config",
    authenticateToken2,
    checkPermission("admin:settings"),
    async (req, res) => {
      try {
        const repoConfig = await prisma20.system_config.findUnique({
          where: { key: "github_repo_url" }
        });
        const branchConfig = await prisma20.system_config.findUnique({
          where: { key: "github_branch" }
        });
        res.json({
          repoUrl: repoConfig?.value || "",
          branch: branchConfig?.value || "main",
          configured: !!repoConfig?.value
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.put(
    "/api/admin/github-config",
    authenticateToken2,
    checkPermission("admin:settings"),
    validateZod(githubConfigSchema),
    async (req, res) => {
      try {
        const { repoUrl, branch } = req.body;
        if (repoUrl) {
          if (typeof repoUrl !== "string" || repoUrl.length > 300) {
            return res.status(400).json({ error: "Formato inv\xE1lido de repoUrl" });
          }
          const ownerRepoMatch = repoUrl.match(/^([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+)$/);
          if (!ownerRepoMatch) {
            try {
              const candidate = repoUrl.startsWith("http://") || repoUrl.startsWith("https://") ? repoUrl : `https://${repoUrl}`;
              const parsed = new URL(candidate);
              const hostname = parsed.hostname.toLowerCase();
              if (!(hostname === "github.com" || hostname.endsWith(".github.com"))) {
                return res.status(400).json({ error: "Solo se permiten URLs de GitHub en repoUrl" });
              }
              if (parsed.username || parsed.password) {
                return res.status(400).json({ error: "URL inv\xE1lida en repoUrl" });
              }
              const parts = parsed.pathname.split("/").filter(Boolean);
              if (parts.length < 2) {
                return res.status(400).json({ error: "URL de GitHub inv\xE1lida, debe apuntar a owner/repo" });
              }
              const owner = parts[0];
              const repo = parts[1];
              req.body.repoUrl = `https://github.com/${owner}/${repo}`;
            } catch (e) {
              return res.status(400).json({ error: "Formato inv\xE1lido. Use 'owner/repo' o una URL v\xE1lida de GitHub" });
            }
          }
        }
        if (repoUrl !== void 0) {
          await prisma20.system_config.upsert({
            where: { key: "github_repo_url" },
            create: {
              id: randomUUID9(),
              key: "github_repo_url",
              value: repoUrl,
              description: "URL del repositorio de GitHub para actualizaciones",
              is_editable: true,
              updatedAt: /* @__PURE__ */ new Date()
            },
            update: { value: repoUrl }
          });
        }
        if (branch !== void 0) {
          await prisma20.system_config.upsert({
            where: { key: "github_branch" },
            create: {
              id: randomUUID9(),
              key: "github_branch",
              value: branch,
              description: "Rama de GitHub para actualizaciones",
              is_editable: true,
              updatedAt: /* @__PURE__ */ new Date()
            },
            update: { value: branch }
          });
        }
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: "Actualiz\xF3 configuraci\xF3n de GitHub",
          modulo: "admin",
          detalles: `Repositorio: ${repoUrl || "sin cambios"}, Rama: ${branch || "sin cambios"}`
        });
        res.json({
          success: true,
          message: "Configuraci\xF3n de GitHub actualizada exitosamente",
          repoUrl,
          branch
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.get(
    "/api/system/version",
    authenticateToken2,
    checkPermission("admin:system"),
    async (req, res) => {
      try {
        const currentVersion = await getCurrentVersion();
        const repoConfig = await prisma20.system_config.findUnique({
          where: { key: "github_repo_url" }
        });
        if (!repoConfig?.value) {
          return res.json({
            current: currentVersion,
            latest: null,
            updateAvailable: false,
            configured: false,
            message: "Repositorio de GitHub no configurado"
          });
        }
        const match = repoConfig.value.match(/github\.com\/([^\/]+)\/([^\/]+)/);
        if (!match) {
          return res.json({
            current: currentVersion,
            latest: null,
            updateAvailable: false,
            configured: false,
            message: "URL de GitHub no v\xE1lida"
          });
        }
        const [, owner, repo] = match;
        const versionInfo = await checkForUpdates2(owner, repo.replace(".git", ""));
        res.json({
          ...versionInfo,
          configured: true
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.post(
    "/api/system/update",
    authenticateToken2,
    checkPermission("admin:system"),
    async (req, res) => {
      try {
        const gitCheck = await verifyGitSetup();
        if (!gitCheck.installed) {
          return res.status(400).json({
            error: "Git no est\xE1 instalado",
            message: gitCheck.message
          });
        }
        if (!gitCheck.configured) {
          return res.status(400).json({
            error: "Repositorio Git no configurado",
            message: gitCheck.message
          });
        }
        performSystemUpdate(req.user.id, (progress) => {
          const io3 = req.app.io;
          if (io3) {
            io3.to(`user:${req.user.id}`).emit("update:progress", progress);
          }
        }).then((result) => {
          const io3 = req.app.io;
          if (io3) {
            io3.to(`user:${req.user.id}`).emit("update:complete", result);
          }
        }).catch((error) => {
          const io3 = req.app.io;
          if (io3) {
            io3.to(`user:${req.user.id}`).emit("update:error", { error: error.message });
          }
        });
        res.json({
          success: true,
          message: "Actualizaci\xF3n iniciada. Recibir\xE1 notificaciones del progreso."
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.get(
    "/api/system/backups",
    authenticateToken2,
    checkPermission("admin:system"),
    async (req, res) => {
      try {
        const backups = await listBackups();
        res.json(backups);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.post(
    "/api/system/backups",
    authenticateToken2,
    checkPermission("admin:system"),
    async (req, res) => {
      try {
        const backup = await createSystemBackup(req.user.id);
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: "Cre\xF3 backup del sistema",
          modulo: "sistema",
          detalles: `Backup ID: ${backup.id}, Versi\xF3n: ${backup.version}`
        });
        res.json(backup);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.post(
    "/api/system/restore/:id",
    authenticateToken2,
    checkPermission("admin:system"),
    async (req, res) => {
      try {
        await restoreFromBackup(req.params.id, req.user.id);
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: "Restaur\xF3 sistema desde backup",
          modulo: "sistema",
          detalles: `Backup ID: ${req.params.id}`
        });
        res.json({
          success: true,
          message: "Sistema restaurado exitosamente. Reinicie el servidor para aplicar los cambios."
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.get(
    "/api/system/updates",
    authenticateToken2,
    checkPermission("admin:system"),
    async (req, res) => {
      try {
        const updates = await getUpdateHistory(20);
        res.json(updates);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.get(
    "/api/roles",
    authenticateToken2,
    checkPermission("admin:roles"),
    async (req, res) => {
      try {
        const roles = await prismaStorage.getAllRoles();
        const enrichedRoles = roles.map((role) => ({
          ...role,
          color: role.color || "#6366f1",
          icon: role.icon || "shield",
          can_create_users: role.can_create_users !== void 0 ? role.can_create_users : false,
          can_delete_users: role.can_delete_users !== void 0 ? role.can_delete_users : false,
          can_manage_roles: role.can_manage_roles !== void 0 ? role.can_manage_roles : false,
          is_active: role.is_active !== void 0 ? role.is_active : true
        }));
        res.json(enrichedRoles);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.get(
    "/api/roles/:id",
    authenticateToken2,
    checkPermission("admin:roles"),
    async (req, res) => {
      try {
        const role = await prismaStorage.getRoleById(req.params.id);
        if (!role) {
          return res.status(404).json({ error: "Rol no encontrado" });
        }
        const enrichedRole = {
          ...role,
          color: role.color || "#6366f1",
          icon: role.icon || "shield",
          can_create_users: role.can_create_users !== void 0 ? role.can_create_users : false,
          can_delete_users: role.can_delete_users !== void 0 ? role.can_delete_users : false,
          can_manage_roles: role.can_manage_roles !== void 0 ? role.can_manage_roles : false,
          is_active: role.is_active !== void 0 ? role.is_active : true
        };
        res.json(enrichedRole);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.post(
    "/api/roles",
    authenticateToken2,
    checkPermission("admin:roles"),
    async (req, res) => {
      try {
        const {
          name,
          description,
          color,
          icon,
          can_create_users,
          can_delete_users,
          can_manage_roles
        } = req.body;
        if (!name) {
          return res.status(400).json({ error: "El nombre del rol es requerido" });
        }
        const existingRole = await prisma20.roles.findUnique({
          where: { name }
        });
        if (existingRole) {
          return res.status(400).json({ error: "Ya existe un rol con ese nombre" });
        }
        const role = await prisma20.roles.create({
          data: {
            id: randomUUID9(),
            name,
            description: description || null,
            is_system: false,
            createdAt: /* @__PURE__ */ new Date(),
            updatedAt: /* @__PURE__ */ new Date()
          },
          include: {
            role_permissions: {
              include: {
                permissions: true
              }
            }
          }
        });
        const enrichedRole = {
          ...role,
          color: color || "#6366f1",
          icon: icon || "shield",
          can_create_users: can_create_users || false,
          can_delete_users: can_delete_users || false,
          can_manage_roles: can_manage_roles || false,
          is_active: true,
          created_by: req.user.id
        };
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: `Cre\xF3 el rol personalizado: ${name}`,
          modulo: "admin",
          detalles: JSON.stringify({
            description,
            color,
            icon,
            can_create_users,
            can_delete_users,
            can_manage_roles
          })
        });
        res.status(201).json(enrichedRole);
      } catch (error) {
        console.error("Error creando rol:", error);
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.patch(
    "/api/roles/:id",
    authenticateToken2,
    checkPermission("admin:roles"),
    async (req, res) => {
      try {
        const { id } = req.params;
        const {
          name,
          description,
          color,
          icon,
          can_create_users,
          can_delete_users,
          can_manage_roles,
          is_active
        } = req.body;
        const existingRole = await prisma20.roles.findUnique({
          where: { id }
        });
        if (!existingRole) {
          return res.status(404).json({ error: "Rol no encontrado" });
        }
        if (existingRole.is_system) {
          return res.status(403).json({
            error: "No se pueden modificar roles del sistema",
            code: "SYSTEM_ROLE_PROTECTED"
          });
        }
        if (name && name !== existingRole.name) {
          const duplicateRole = await prisma20.roles.findUnique({
            where: { name }
          });
          if (duplicateRole) {
            return res.status(400).json({ error: "Ya existe un rol con ese nombre" });
          }
        }
        const updateData = {
          updatedAt: /* @__PURE__ */ new Date()
        };
        if (name !== void 0) updateData.name = name;
        if (description !== void 0) updateData.description = description;
        const additionalFields = {};
        if (color !== void 0) additionalFields.color = color;
        if (icon !== void 0) additionalFields.icon = icon;
        if (can_create_users !== void 0) additionalFields.can_create_users = can_create_users;
        if (can_delete_users !== void 0) additionalFields.can_delete_users = can_delete_users;
        if (can_manage_roles !== void 0) additionalFields.can_manage_roles = can_manage_roles;
        if (is_active !== void 0) additionalFields.is_active = is_active;
        const role = await prisma20.roles.update({
          where: { id },
          data: updateData,
          include: {
            role_permissions: {
              include: {
                permissions: true
              }
            }
          }
        });
        const enrichedRole = {
          ...role,
          ...additionalFields,
          color: additionalFields.color || "#6366f1",
          icon: additionalFields.icon || "shield",
          can_create_users: additionalFields.can_create_users || false,
          can_delete_users: additionalFields.can_delete_users || false,
          can_manage_roles: additionalFields.can_manage_roles || false,
          is_active: additionalFields.is_active !== void 0 ? additionalFields.is_active : true
        };
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: `Actualiz\xF3 el rol personalizado: ${role.name}`,
          modulo: "admin",
          detalles: JSON.stringify({ ...updateData, ...additionalFields })
        });
        res.json(enrichedRole);
      } catch (error) {
        console.error("Error actualizando rol:", error);
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.delete(
    "/api/roles/:id",
    authenticateToken2,
    checkPermission("admin:roles"),
    async (req, res) => {
      try {
        const { id } = req.params;
        const role = await prisma20.roles.findUnique({
          where: { id }
        });
        if (!role) {
          return res.status(404).json({ error: "Rol no encontrado" });
        }
        if (role.is_system) {
          return res.status(403).json({
            error: "No se pueden eliminar roles del sistema",
            code: "SYSTEM_ROLE_PROTECTED"
          });
        }
        const usersWithRole = await prisma20.users.count({
          where: { roleId: id }
        });
        if (usersWithRole > 0) {
          return res.status(409).json({
            error: `No se puede eliminar el rol: hay ${usersWithRole} usuario(s) asignado(s) a este rol. Reasignalos a otro rol primero.`,
            code: "ROLE_IN_USE"
          });
        }
        await prisma20.role_permissions.deleteMany({
          where: { roleId: id }
        });
        await prisma20.roles.delete({
          where: { id }
        });
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: `Elimin\xF3 el rol personalizado: ${role.name}`,
          modulo: "admin",
          detalles: `ID: ${id}`
        });
        res.json({
          success: true,
          message: `Rol "${role.name}" eliminado exitosamente`
        });
      } catch (error) {
        console.error("Error eliminando rol:", error);
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.get(
    "/api/permissions",
    authenticateToken2,
    checkPermission("admin:roles"),
    async (req, res) => {
      try {
        const permissions = await prismaStorage.getAllPermissions();
        res.json(permissions);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.post(
    "/api/roles/:id/permissions",
    authenticateToken2,
    checkPermission("admin:roles"),
    async (req, res) => {
      try {
        const { permissionIds } = req.body;
        if (!Array.isArray(permissionIds)) {
          return res.status(400).json({ error: "permissionIds debe ser un array" });
        }
        const role = await prismaStorage.assignPermissionsToRole(req.params.id, permissionIds);
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: `Asign\xF3 permisos al rol: ${role?.name}`,
          modulo: "admin",
          detalles: `${permissionIds.length} permisos asignados`
        });
        res.json(role);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.post(
    "/api/roles/:id/assign-permissions",
    authenticateToken2,
    checkPermission("admin:roles"),
    async (req, res) => {
      try {
        const { id } = req.params;
        const { permissionIds } = req.body;
        if (!Array.isArray(permissionIds)) {
          return res.status(400).json({ error: "permissionIds debe ser un array" });
        }
        const role = await prisma20.roles.findUnique({
          where: { id }
        });
        if (!role) {
          return res.status(404).json({ error: "Rol no encontrado" });
        }
        if (role.is_system) {
          return res.status(403).json({
            error: "No se pueden modificar permisos de roles del sistema",
            code: "SYSTEM_ROLE_PROTECTED"
          });
        }
        await prisma20.role_permissions.deleteMany({
          where: { roleId: id }
        });
        const rolePermissions = await Promise.all(
          permissionIds.map(
            (permissionId) => prisma20.role_permissions.create({
              data: {
                id: randomUUID9(),
                roleId: id,
                permissionId
              }
            })
          )
        );
        const updatedRole = await prisma20.roles.findUnique({
          where: { id },
          include: {
            role_permissions: {
              include: {
                permissions: true
              }
            }
          }
        });
        const enrichedRole = {
          ...updatedRole,
          color: updatedRole?.color || "#6366f1",
          icon: updatedRole?.icon || "shield",
          can_create_users: updatedRole?.can_create_users !== void 0 ? updatedRole.can_create_users : false,
          can_delete_users: updatedRole?.can_delete_users !== void 0 ? updatedRole.can_delete_users : false,
          can_manage_roles: updatedRole?.can_manage_roles !== void 0 ? updatedRole.can_manage_roles : false,
          is_active: updatedRole?.is_active !== void 0 ? updatedRole.is_active : true
        };
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: `Asign\xF3 ${permissionIds.length} permisos al rol: ${role.name}`,
          modulo: "admin",
          detalles: JSON.stringify({
            permissionIds,
            totalPermissions: permissionIds.length
          })
        });
        res.json({
          success: true,
          message: `${permissionIds.length} permisos asignados al rol "${role.name}"`,
          role: enrichedRole
        });
      } catch (error) {
        console.error("Error asignando permisos:", error);
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.get(
    "/api/audit",
    authenticateToken2,
    checkPermission("audits:read"),
    async (req, res) => {
      try {
        const { table, recordId, userId } = req.query;
        let audits;
        if (table && recordId) {
          audits = await prismaStorage.getAuditEntriesByRecord(table, recordId);
        } else if (table) {
          audits = await prismaStorage.getAuditEntriesByTable(table);
        } else if (userId) {
          audits = await prismaStorage.getAuditEntriesByUser(userId);
        } else {
          audits = await prismaStorage.getAllAuditEntries();
        }
        const usersMap = /* @__PURE__ */ new Map();
        const users = await prismaStorage.getAllUsers();
        users.forEach((u) => usersMap.set(u.id, u));
        const auditsWithUsers = audits.map((audit) => ({
          ...audit,
          usuario: usersMap.get(audit.usuarioId)
        }));
        res.json(auditsWithUsers);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.get(
    "/api/search",
    authenticateToken2,
    async (req, res) => {
      try {
        const { q } = req.query;
        if (!q || typeof q !== "string" || q.trim().length < 2) {
          return res.status(400).json({ error: "Consulta de b\xFAsqueda demasiado corta (m\xEDnimo 2 caracteres)" });
        }
        console.log("About to call globalSearch with:", q.trim());
        const results = await prismaStorage.globalSearch(q.trim());
        console.log("globalSearch returned successfully");
        console.log("Search results:", {
          clientes: results.clientes.length,
          tareas: results.tareas.length,
          impuestos: results.impuestos.length,
          manuales: results.manuales.length
        });
        const serializedResults = JSON.parse(JSON.stringify(results));
        res.json(serializedResults);
      } catch (error) {
        console.error("Search error:", error);
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.get("/api/tax-requirements", authenticateToken2, async (req, res) => {
    try {
      res.json([]);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/tax-requirements", authenticateToken2, checkPermission("taxes:create"), async (req, res) => {
    try {
      res.status(501).json({ error: "Tax requirements no longer supported" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.patch("/api/tax-requirements/:id/toggle", authenticateToken2, checkPermission("taxes:update"), async (req, res) => {
    try {
      res.status(501).json({ error: "Tax requirements no longer supported" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.patch("/api/tax-requirements/:id", authenticateToken2, checkPermission("taxes:update"), async (req, res) => {
    try {
      res.status(501).json({ error: "Tax requirements no longer supported" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/fiscal-periods", authenticateToken2, async (req, res) => {
    try {
      const periods = await prisma20.fiscal_periods.findMany({
        orderBy: [{ year: "desc" }, { quarter: "asc" }]
      });
      res.json(periods);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.get(
    "/api/tax/periods",
    authenticateToken2,
    checkPermission("taxes:read"),
    async (req, res) => {
      try {
        const year = req.query.year ? parseInt(req.query.year, 10) : void 0;
        const periods = await prismaStorage.getFiscalPeriodsSummary(year);
        res.json(periods);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.get(
    "/api/tax/periods/:id",
    authenticateToken2,
    checkPermission("taxes:read"),
    async (req, res) => {
      try {
        const period = await prismaStorage.getFiscalPeriod(req.params.id);
        if (!period) {
          return res.status(404).json({ error: "Periodo no encontrado" });
        }
        res.json(period);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.post(
    "/api/tax/periods/create-year",
    authenticateToken2,
    checkPermission("taxes:create"),
    async (req, res) => {
      try {
        const year = parseInt(req.body?.year, 10);
        if (!Number.isFinite(year)) {
          return res.status(400).json({ error: "A\xF1o inv\xE1lido" });
        }
        const periods = await prismaStorage.createFiscalYear(year);
        res.json(periods);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.post(
    "/api/tax/periods/create",
    authenticateToken2,
    checkPermission("taxes:create"),
    async (req, res) => {
      try {
        const { year, kind, label, quarter, startsAt, endsAt } = req.body;
        if (!year || !kind || !label || !startsAt || !endsAt) {
          return res.status(400).json({ error: "Faltan campos obligatorios" });
        }
        const summary = await prismaStorage.createFiscalPeriod({
          year: parseInt(year, 10),
          kind,
          label,
          quarter: quarter ?? null,
          startsAt: new Date(startsAt),
          endsAt: new Date(endsAt)
        });
        res.json(summary);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.patch(
    "/api/tax/periods/:id/status",
    authenticateToken2,
    checkPermission("taxes:update"),
    async (req, res) => {
      try {
        const { id } = req.params;
        const { status } = req.body;
        if (!status) {
          return res.status(400).json({ error: "Estado requerido" });
        }
        const updated = await prismaStorage.toggleFiscalPeriodStatus(id, status, req.user?.id);
        res.json(updated);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.get(
    "/api/tax-models",
    authenticateToken2,
    checkPermission("taxes:read"),
    async (_req, res) => {
      try {
        const models = await prismaStorage.getAllTaxModels();
        res.json(models);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.post(
    "/api/tax-models",
    authenticateToken2,
    checkPermission("taxes:update"),
    async (req, res) => {
      try {
        const { code, name, allowedTypes, allowedPeriods } = req.body;
        if (!code || !name) {
          return res.status(400).json({ error: "C\xF3digo y nombre son requeridos" });
        }
        const existing = await prismaStorage.getTaxModelByCode(code.toUpperCase());
        if (existing) {
          return res.status(409).json({ error: "Ya existe un modelo con ese c\xF3digo" });
        }
        const model = await prismaStorage.createTaxModel({
          code: code.toUpperCase(),
          name,
          allowedTypes: Array.isArray(allowedTypes) ? allowedTypes : [],
          allowedPeriods: Array.isArray(allowedPeriods) ? allowedPeriods : []
        });
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: `Cre\xF3 modelo fiscal ${code}`,
          modulo: "impuestos",
          detalles: `Nombre: ${name}`
        });
        res.status(201).json(model);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.put(
    "/api/tax-models/:code",
    authenticateToken2,
    checkPermission("taxes:update"),
    async (req, res) => {
      try {
        const { code } = req.params;
        const { name, allowedTypes, allowedPeriods, isActive } = req.body;
        const existing = await prismaStorage.getTaxModelByCode(code.toUpperCase());
        if (!existing) {
          return res.status(404).json({ error: "Modelo no encontrado" });
        }
        const updated = await prismaStorage.updateTaxModel(code.toUpperCase(), {
          name,
          allowedTypes: Array.isArray(allowedTypes) ? allowedTypes : void 0,
          allowedPeriods: Array.isArray(allowedPeriods) ? allowedPeriods : void 0,
          isActive
        });
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: `Actualiz\xF3 modelo fiscal ${code}`,
          modulo: "impuestos",
          detalles: `Nombre: ${name}`
        });
        res.json(updated);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.delete(
    "/api/tax-models/:code",
    authenticateToken2,
    checkPermission("taxes:delete"),
    async (req, res) => {
      try {
        const { code } = req.params;
        const existing = await prismaStorage.getTaxModelByCode(code.toUpperCase());
        if (!existing) {
          return res.status(404).json({ error: "Modelo no encontrado" });
        }
        const assignments = await prismaStorage.getAssignmentsByTaxModel(code.toUpperCase());
        if (assignments && assignments.length > 0) {
          return res.status(409).json({
            error: `No se puede eliminar el modelo ${code} porque tiene ${assignments.length} asignaciones activas`
          });
        }
        await prismaStorage.deleteTaxModel(code.toUpperCase());
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: `Elimin\xF3 modelo fiscal ${code}`,
          modulo: "impuestos",
          detalles: `Nombre: ${existing.name}`
        });
        res.json({ success: true, message: "Modelo eliminado correctamente" });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.get(
    "/api/tax/calendar",
    authenticateToken2,
    checkPermission("taxes:read"),
    async (req, res) => {
      try {
        const y = Number(req.query.year);
        const model = req.query.model?.toUpperCase();
        const periodicity = req.query.periodicity?.toLowerCase();
        const status = req.query.status?.toUpperCase();
        const where = {};
        if (!Number.isNaN(y)) where.year = y;
        if (model) where.modelCode = model;
        if (periodicity === "monthly") where.period = { startsWith: "M" };
        if (periodicity === "quarterly") where.period = { in: ["1T", "2T", "3T", "4T"] };
        if (periodicity === "annual") where.period = "ANUAL";
        if (periodicity === "special") where.period = { in: ["M04", "M10", "M12"] };
        if (status && ["PENDIENTE", "ABIERTO", "CERRADO"].includes(status)) where.status = status;
        const list = await prisma20.tax_calendar.findMany({ where, orderBy: [{ endDate: "asc" }] });
        const rows = list.map((r) => ({
          id: r.id,
          modelCode: r.modelCode,
          period: r.period,
          year: r.year,
          startDate: r.startDate,
          endDate: r.endDate,
          status: r.status,
          daysToStart: r.days_to_start,
          daysToEnd: r.days_to_end,
          active: r.active,
          locked: r.locked
        }));
        res.json(rows);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.post(
    "/api/tax/calendar",
    authenticateToken2,
    checkPermission("taxes:create"),
    async (req, res) => {
      try {
        const { modelCode, period, year, startDate, endDate, active = true } = req.body || {};
        if (!modelCode || !period || !year || !startDate || !endDate) {
          return res.status(400).json({ error: "Campos requeridos: modelCode, period, year, startDate, endDate" });
        }
        const parsedYear = Number(year);
        if (!Number.isFinite(parsedYear)) return res.status(400).json({ error: "A\xF1o inv\xE1lido" });
        const entry = await prismaStorage.createTaxCalendar({
          modelCode: String(modelCode).toUpperCase(),
          period: String(period).toUpperCase(),
          year: parsedYear,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          active: Boolean(active)
        });
        res.status(201).json(entry);
      } catch (error) {
        if (error?.code === "P2002") {
          return res.status(409).json({ error: "Ya existe un periodo para ese Modelo/Periodo/A\xF1o" });
        }
        res.status(500).json({ error: error?.message || "Error desconocido" });
      }
    }
  );
  app2.patch(
    "/api/tax/calendar/:id",
    authenticateToken2,
    checkPermission("taxes:update"),
    async (req, res) => {
      try {
        const data = {};
        if (req.body.startDate) data.startDate = new Date(req.body.startDate);
        if (req.body.endDate) data.endDate = new Date(req.body.endDate);
        if (typeof req.body.active !== "undefined") data.active = Boolean(req.body.active);
        if (typeof req.body.locked !== "undefined") data.locked = Boolean(req.body.locked);
        const updated = await prismaStorage.updateTaxCalendar(req.params.id, data);
        res.json(updated);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.delete(
    "/api/tax/calendar/:id",
    authenticateToken2,
    checkPermission("taxes:delete"),
    async (req, res) => {
      try {
        const ok = await prismaStorage.deleteTaxCalendar(req.params.id);
        if (!ok) return res.status(404).json({ error: "Periodo no encontrado" });
        res.status(204).end();
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.post(
    "/api/tax/calendar/create-year",
    authenticateToken2,
    checkPermission("taxes:create"),
    async (req, res) => {
      try {
        const y = Number(req.body?.year);
        if (!Number.isFinite(y)) return res.status(400).json({ error: "A\xF1o inv\xE1lido" });
        const created = await prismaStorage.cloneTaxCalendarYear(y);
        res.json({ created: created.length });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.post(
    "/api/tax/calendar/seed-year",
    authenticateToken2,
    checkPermission("taxes:create"),
    async (req, res) => {
      try {
        const y = Number(req.body?.year);
        if (!Number.isFinite(y)) return res.status(400).json({ error: "A\xF1o inv\xE1lido" });
        const model = req.body?.model?.toUpperCase();
        const periodicity = req.body?.periodicity?.toLowerCase();
        const result = await prismaStorage.seedTaxCalendarYear(y, {
          modelCode: model,
          periodicity: periodicity === "monthly" || periodicity === "quarterly" || periodicity === "annual" || periodicity === "special" ? periodicity : "all"
        });
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.post(
    "/api/tax/calendar/generate-aeat-calendar",
    authenticateToken2,
    checkPermission("taxes:create"),
    async (req, res) => {
      try {
        const y = Number(req.body?.year);
        if (!Number.isFinite(y)) return res.status(400).json({ error: "A\xF1o inv\xE1lido" });
        logger.info({ year: y }, "Generando calendario AEAT completo");
        const dbUrl2 = process.env.DATABASE_URL;
        const { stdout, stderr } = await execPromise(
          `DATABASE_URL="${dbUrl2}" YEAR="${y}" npx tsx server/scripts/generate-tax-calendar-aeat.ts --year=${y}`,
          {
            cwd: process.cwd(),
            timeout: 3e4
            // 30 segundos timeout
          }
        );
        logger.info({ stdout, stderr }, "Calendario AEAT generado exitosamente");
        res.json({
          success: true,
          message: `Calendario AEAT completo generado para ${y} y ${y + 1}`,
          output: stdout
        });
      } catch (error) {
        logger.error({ error: error.message, stderr: error.stderr }, "Error generando calendario AEAT");
        res.status(500).json({
          error: error.message || "Error al generar el calendario",
          details: error.stderr
        });
      }
    }
  );
  app2.get(
    "/api/tax/calendar/:year.ics",
    authenticateToken2,
    checkPermission("taxes:read"),
    async (req, res) => {
      try {
        const y = Number(req.params.year);
        if (!Number.isFinite(y)) return res.status(400).send("");
        const rows = await prisma20.tax_calendar.findMany({ where: { year: y }, orderBy: [{ startDate: "asc" }] });
        const toICSDate = (d) => {
          const pad = (n) => String(n).padStart(2, "0");
          const yyyy = d.getUTCFullYear();
          const mm = pad(d.getUTCMonth() + 1);
          const dd = pad(d.getUTCDate());
          const hh = pad(d.getUTCHours());
          const mi = pad(d.getUTCMinutes());
          const ss = pad(d.getUTCSeconds());
          return `${yyyy}${mm}${dd}T${hh}${mi}${ss}Z`;
        };
        const lines = [];
        lines.push("BEGIN:VCALENDAR");
        lines.push("VERSION:2.0");
        lines.push("PRODID:-//Asesoria La Llave//Calendario AEAT//ES");
        for (const r of rows) {
          const dtStart = toICSDate(r.startDate);
          const dtEnd = toICSDate(r.endDate);
          const summary = `${r.modelCode} ${r.period}/${r.year}`;
          lines.push("BEGIN:VEVENT");
          lines.push(`UID:${r.id}@asesoria-la-llave`);
          lines.push(`DTSTAMP:${toICSDate(/* @__PURE__ */ new Date())}`);
          lines.push(`DTSTART:${dtStart}`);
          lines.push(`DTEND:${dtEnd}`);
          lines.push(`SUMMARY:${summary}`);
          lines.push("END:VEVENT");
        }
        lines.push("END:VCALENDAR");
        res.setHeader("Content-Type", "text/calendar; charset=utf-8");
        res.send(lines.join("\r\n"));
      } catch (error) {
        res.status(500).send("");
      }
    }
  );
  app2.get(
    "/api/tax/calendar/download-template",
    authenticateToken2,
    checkPermission("taxes:read"),
    async (req, res) => {
      try {
        const buffer = await generateTemplate();
        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader(
          "Content-Disposition",
          'attachment; filename="plantilla-calendario-fiscal.xlsx"'
        );
        res.send(buffer);
      } catch (error) {
        logger.error({ err: error }, "Error generando plantilla Excel");
        res.status(500).json({
          error: "No se pudo generar la plantilla",
          details: error?.message
        });
      }
    }
  );
  app2.post(
    "/api/tax/calendar/import-excel",
    authenticateToken2,
    checkPermission("taxes:create"),
    uploadExcel.single("file"),
    async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: "No se proporcion\xF3 ning\xFAn archivo" });
        }
        const userId = req.user?.id || "system";
        const result = await processExcelImport(req.file.buffer, userId);
        if (!result.success) {
          return res.status(400).json({
            error: "Errores durante la importaci\xF3n",
            result
          });
        }
        res.json({
          message: "Importaci\xF3n completada",
          result
        });
      } catch (error) {
        logger.error({ err: error }, "Error en importaci\xF3n Excel");
        res.status(500).json({
          error: "Error procesando el archivo Excel",
          details: error?.message
        });
      }
    }
  );
  const parseReportFilters = (req) => {
    const parseNumber = (value) => {
      if (value === void 0 || value === null || value === "") return void 0;
      const n = Number(value);
      return Number.isFinite(n) ? n : void 0;
    };
    return {
      year: parseNumber(req.query.year),
      periodId: req.query.periodId ? String(req.query.periodId) : void 0,
      model: req.query.model ? String(req.query.model) : void 0,
      assigneeId: req.query.assigneeId ? String(req.query.assigneeId) : void 0,
      clientId: req.query.clientId ? String(req.query.clientId) : void 0,
      status: req.query.status ? String(req.query.status) : void 0
    };
  };
  app2.get(
    "/api/tax/reports/kpis",
    authenticateToken2,
    checkPermission("taxes:read"),
    async (req, res) => {
      try {
        const data = await getReportsKpis(parseReportFilters(req));
        res.json(data);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.get(
    "/api/tax/reports/summary/model",
    authenticateToken2,
    checkPermission("taxes:read"),
    async (req, res) => {
      try {
        const data = await getSummaryByModel(parseReportFilters(req));
        res.json(data);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.get(
    "/api/tax/reports/summary/assignee",
    authenticateToken2,
    checkPermission("taxes:read"),
    async (req, res) => {
      try {
        const data = await getSummaryByAssignee(parseReportFilters(req));
        res.json(data);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.get(
    "/api/tax/reports/summary/client",
    authenticateToken2,
    checkPermission("taxes:read"),
    async (req, res) => {
      try {
        const data = await getSummaryByClient(parseReportFilters(req));
        res.json(data);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.get(
    "/api/tax/reports/trends",
    authenticateToken2,
    checkPermission("taxes:read"),
    async (req, res) => {
      try {
        const filters = parseReportFilters(req);
        const data = await getTrends({ ...filters, granularity: req.query.granularity === "week" ? "week" : "month" });
        res.json(data);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.get(
    "/api/tax/reports/exceptions",
    authenticateToken2,
    checkPermission("taxes:read"),
    async (req, res) => {
      try {
        const data = await getExceptions(parseReportFilters(req));
        res.json(data);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.get(
    "/api/tax/reports/filings",
    authenticateToken2,
    checkPermission("taxes:read"),
    async (req, res) => {
      try {
        const filters = parseReportFilters(req);
        const page = Number(req.query.page || 1);
        const size = Number(req.query.size || 50);
        const data = await getFilings({ ...filters, page, size });
        res.json(data);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.get(
    "/api/tax/reports/export",
    authenticateToken2,
    checkPermission("taxes:read"),
    async (req, res) => {
      try {
        const filters = parseReportFilters(req);
        const data = await getFilings({ ...filters, page: 1, size: 2e3 });
        const headers = [
          "Modelo",
          "Periodo",
          "Cliente",
          "Gestor",
          "Estado",
          "Fecha presentaci\xF3n",
          "Fecha l\xEDmite",
          "D\xEDas restantes",
          "D\xEDas ciclo"
        ];
        const lines = [
          headers.join(","),
          ...data.items.map((item) => {
            const fields = [
              item.modelCode,
              item.periodLabel,
              item.cliente ?? "",
              item.gestor ?? "",
              String(item.status ?? "").toUpperCase(),
              item.presentedAt ? new Date(item.presentedAt).toISOString() : "",
              item.dueDate ? new Date(item.dueDate).toISOString() : "",
              item.daysRemaining ?? "",
              item.cycleDays ?? ""
            ];
            return fields.map((field) => {
              if (field === null || field === void 0) return "";
              const text = String(field);
              return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
            }).join(",");
          })
        ].join("\n");
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="reporte-impuestos-${filters.year ?? "global"}.csv"`
        );
        res.send(lines);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.get(
    "/api/tax/reports/export-excel",
    authenticateToken2,
    checkPermission("taxes:read"),
    async (req, res) => {
      try {
        const filters = parseReportFilters(req);
        const { generateAdvancedExcelBuffer: generateAdvancedExcelBuffer2 } = await Promise.resolve().then(() => (init_reports_export_service(), reports_export_service_exports));
        const buffer = await generateAdvancedExcelBuffer2(filters);
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="reporte-impuestos-${filters.year ?? "global"}-${Date.now()}.xlsx"`
        );
        res.send(buffer);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.get(
    "/api/tax/reports/year-comparison",
    authenticateToken2,
    checkPermission("taxes:read"),
    async (req, res) => {
      try {
        const year1 = Number(req.query.year1 || (/* @__PURE__ */ new Date()).getFullYear() - 1);
        const year2 = Number(req.query.year2 || (/* @__PURE__ */ new Date()).getFullYear());
        const filters = {
          model: req.query.model ? String(req.query.model) : void 0,
          assigneeId: req.query.assigneeId ? String(req.query.assigneeId) : void 0,
          clientId: req.query.clientId ? String(req.query.clientId) : void 0
        };
        const { getYearComparison: getYearComparison2 } = await Promise.resolve().then(() => (init_reports_service(), reports_service_exports));
        const data = await getYearComparison2(year1, year2, filters);
        res.json(data);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.get(
    "/api/tax/reports/productivity",
    authenticateToken2,
    checkPermission("taxes:read"),
    async (req, res) => {
      try {
        const { getProductivityAnalysis: getProductivityAnalysis2 } = await Promise.resolve().then(() => (init_reports_service(), reports_service_exports));
        const data = await getProductivityAnalysis2(parseReportFilters(req));
        res.json(data);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.get(
    "/api/tax/reports/predictions",
    authenticateToken2,
    checkPermission("taxes:read"),
    async (req, res) => {
      try {
        const { getPredictions: getPredictions2 } = await Promise.resolve().then(() => (init_reports_service(), reports_service_exports));
        const data = await getPredictions2(parseReportFilters(req));
        res.json(data);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.get(
    "/api/tax/reports/temporal-performance",
    authenticateToken2,
    checkPermission("taxes:read"),
    async (req, res) => {
      try {
        const { getTemporalPerformance: getTemporalPerformance2 } = await Promise.resolve().then(() => (init_reports_service(), reports_service_exports));
        const data = await getTemporalPerformance2(parseReportFilters(req));
        res.json(data);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.get(
    "/api/tax/reports/goals",
    authenticateToken2,
    checkPermission("taxes:read"),
    async (req, res) => {
      try {
        const { getGoals: getGoals2, evaluateGoals: evaluateGoals2 } = await Promise.resolve().then(() => (init_goals_service(), goals_service_exports));
        const kpis = await getReportsKpis(parseReportFilters(req));
        const goals = getGoals2();
        const evaluated = evaluateGoals2(kpis, goals);
        res.json(evaluated);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.get(
    "/api/tax/reports/diagnostic",
    authenticateToken2,
    checkPermission("taxes:read"),
    async (req, res) => {
      try {
        const year = req.query.year ? Number(req.query.year) : (/* @__PURE__ */ new Date()).getFullYear();
        const totalFilings = await prisma20.client_tax_filings.count();
        const filingsWithPeriods = await prisma20.client_tax_filings.count({
          where: { fiscal_periods: { isNot: null } }
        });
        const totalPeriods = await prisma20.fiscal_periods.count();
        const periodsThisYear = await prisma20.fiscal_periods.count({ where: { year } });
        const periods = await prisma20.fiscal_periods.findMany({
          select: { year: true },
          distinct: ["year"],
          orderBy: { year: "desc" }
        });
        const filingsThisYear = await prisma20.client_tax_filings.count({
          where: { fiscal_periods: { year } }
        });
        const sampleFilings = await prisma20.client_tax_filings.findMany({
          take: 3,
          include: {
            fiscal_periods: true,
            clients: { select: { razonSocial: true } }
          }
        });
        res.json({
          summary: {
            totalFilings,
            filingsWithPeriods,
            filingsWithoutPeriods: totalFilings - filingsWithPeriods,
            totalPeriods,
            periodsThisYear,
            filingsThisYear
          },
          availableYears: periods.map((p) => p.year),
          requestedYear: year,
          sampleFilings: sampleFilings.map((f) => ({
            id: f.id,
            model: f.taxModelCode,
            client: f.clients?.razonSocial,
            status: f.status,
            periodId: f.periodId,
            periodYear: f.fiscal_periods?.year,
            periodLabel: f.fiscal_periods?.label
          })),
          message: filingsThisYear === 0 && totalFilings > 0 ? `Hay ${totalFilings} declaraciones pero ninguna para el a\xF1o ${year}. A\xF1os disponibles: ${periods.map((p) => p.year).join(", ")}` : `Todo correcto: ${filingsThisYear} declaraciones para ${year}`
        });
      } catch (error) {
        res.status(500).json({ error: error.message, stack: error.stack });
      }
    }
  );
  app2.get(
    "/api/tax/filings",
    authenticateToken2,
    checkPermission("taxes:read"),
    async (req, res) => {
      try {
        const filings = await prismaStorage.getTaxFilings({
          year: req.query.year ? Number(req.query.year) : void 0,
          clientId: req.query.clientId,
          gestorId: req.query.gestorId,
          periodId: req.query.periodId,
          status: req.query.status,
          model: req.query.model,
          search: req.query.q || req.query.search,
          includeClosedPeriods: req.query.includeClosedPeriods === "true"
        });
        res.json(filings);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.post(
    "/api/tax/filings/ensure-year",
    authenticateToken2,
    checkPermission("taxes:update"),
    async (req, res) => {
      try {
        const rawYear = req.body?.year ?? req.query?.year;
        const yearNumber = rawYear === void 0 || rawYear === null || rawYear === "" ? (/* @__PURE__ */ new Date()).getFullYear() : Number(rawYear);
        if (!Number.isFinite(yearNumber)) {
          return res.status(400).json({ error: "A\xF1o inv\xE1lido" });
        }
        const result = await prismaStorage.ensureClientTaxFilingsForYear(yearNumber);
        res.json({
          success: true,
          year: result.year,
          generated: result.generated
        });
      } catch (error) {
        res.status(500).json({ error: error.message || "No se pudieron generar las tarjetas fiscales" });
      }
    }
  );
  app2.patch(
    "/api/tax/filings/:id",
    authenticateToken2,
    checkPermission("taxes:update"),
    async (req, res) => {
      try {
        const isAdmin = req.user?.roleName === "Administrador";
        const updated = await prismaStorage.updateTaxFiling(
          req.params.id,
          {
            status: req.body.status ?? void 0,
            notes: req.body.notes ?? void 0,
            presentedAt: req.body.presentedAt ? new Date(req.body.presentedAt) : req.body.presentedAt === null ? null : void 0,
            assigneeId: req.body.assigneeId ?? void 0
          },
          { allowClosed: isAdmin }
        );
        res.json(updated);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.post(
    "/api/tax/filings/cleanup",
    authenticateToken2,
    checkPermission("taxes:delete"),
    async (req, res) => {
      try {
        const allFilings = await prisma20.client_tax_filings.findMany({
          include: {
            fiscal_periods: true
          }
        });
        const activeModels = await prisma20.client_tax_models.findMany({
          where: { is_active: true }
        });
        const modelMap = /* @__PURE__ */ new Map();
        activeModels.forEach((m) => {
          const key = `${m.client_id}:${m.model_number}`;
          if (!modelMap.has(key)) modelMap.set(key, []);
          modelMap.get(key).push(m);
        });
        const orphanIds = [];
        for (const filing of allFilings) {
          const key = `${filing.clientId}:${filing.taxModelCode}`;
          const clientModels = modelMap.get(key);
          if (!clientModels || clientModels.length === 0) {
            orphanIds.push(filing.id);
            continue;
          }
          const period = filing.fiscal_periods;
          if (!period) {
            orphanIds.push(filing.id);
            continue;
          }
          const ps = period.starts_at;
          const pe = period.ends_at;
          const hasValidModel = clientModels.some((m) => {
            const startOk = m.start_date <= pe;
            const endOk = !m.end_date || m.end_date >= ps;
            return startOk && endOk;
          });
          if (!hasValidModel) {
            orphanIds.push(filing.id);
          }
        }
        if (orphanIds.length > 0) {
          await prisma20.client_tax_filings.deleteMany({
            where: { id: { in: orphanIds } }
          });
        }
        res.json({
          success: true,
          deleted: orphanIds.length,
          message: `Se eliminaron ${orphanIds.length} tarjetas hu\xE9rfanas`
        });
      } catch (error) {
        logger.error({ err: error }, "Error limpiando filings hu\xE9rfanos");
        res.status(500).json({ error: error.message });
      }
    }
  );
  setInterval(() => {
    checkAndSendReminders(prismaStorage).catch(console.error);
  }, 60 * 60 * 1e3);
  registerEpicTasksRoutes(app2);
  const httpServer = createServer(app2);
  const io2 = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:5000",
      methods: ["GET", "POST"],
      credentials: true
    }
  });
  io2.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error("No token provided"));
      }
      const decoded = jwt3.verify(token, JWT_SECRET2);
      const user = await prismaStorage.getUser(decoded.id);
      if (!user) {
        return next(new Error("User not found"));
      }
      const userWithRole = await prismaStorage.getUserWithPermissions(decoded.id);
      const roleName = userWithRole?.roles?.name || "Solo Lectura";
      socket.data.user = {
        id: user.id,
        username: user.username,
        role: roleName,
        roleId: user.roleId
      };
      next();
    } catch (error) {
      console.error("Socket.IO auth error:", error);
      next(new Error("Invalid token"));
    }
  });
  app2.get(
    "/api/notification-templates",
    authenticateToken2,
    checkPermission("notifications:view_history"),
    async (req, res) => {
      try {
        const templates = await prismaStorage.getAllNotificationTemplates();
        res.json(templates);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.post(
    "/api/notification-templates",
    authenticateToken2,
    checkPermission("notifications:create"),
    async (req, res) => {
      try {
        const { nombre, asunto, contenidoHTML, variables, tipo, activa } = req.body;
        if (!nombre || !asunto || !contenidoHTML) {
          return res.status(400).json({ error: "Faltan campos requeridos" });
        }
        const template = await prismaStorage.createNotificationTemplate({
          nombre,
          asunto,
          contenidoHTML,
          variables: variables || null,
          tipo: tipo || "INFORMATIVO",
          activa: activa !== void 0 ? activa : true,
          creadoPor: req.user.id
        });
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: "Cre\xF3 plantilla de notificaci\xF3n",
          modulo: "notificaciones",
          detalles: `Plantilla: ${nombre}`
        });
        res.json(template);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.patch(
    "/api/notification-templates/:id",
    authenticateToken2,
    checkPermission("notifications:update"),
    async (req, res) => {
      try {
        const { id } = req.params;
        const updates = req.body;
        const template = await prismaStorage.updateNotificationTemplate(id, updates);
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: "Actualiz\xF3 plantilla de notificaci\xF3n",
          modulo: "notificaciones",
          detalles: `Plantilla ID: ${id}`
        });
        res.json(template);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.delete(
    "/api/notification-templates/:id",
    authenticateToken2,
    checkPermission("notifications:delete"),
    async (req, res) => {
      try {
        const { id } = req.params;
        await prismaStorage.deleteNotificationTemplate(id);
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: "Elimin\xF3 plantilla de notificaci\xF3n",
          modulo: "notificaciones",
          detalles: `Plantilla ID: ${id}`
        });
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.post(
    "/api/notifications/send",
    authenticateToken2,
    checkPermission("notifications:send"),
    async (req, res) => {
      try {
        const { plantillaId, smtpAccountId, destinatarios, asunto, contenido } = req.body;
        if (!destinatarios || destinatarios.length === 0) {
          return res.status(400).json({ error: "Debe seleccionar al menos un destinatario" });
        }
        const log2 = await prismaStorage.createNotificationLog({
          plantillaId: plantillaId || null,
          smtpAccountId: smtpAccountId || null,
          destinatarios,
          asunto,
          contenido,
          tipo: "EMAIL",
          estado: "ENVIADO",
          fechaEnvio: /* @__PURE__ */ new Date(),
          enviadoPor: req.user.id
        });
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: "Envi\xF3 notificaci\xF3n",
          modulo: "notificaciones",
          detalles: `${destinatarios.length} destinatarios`
        });
        res.json(log2);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.get(
    "/api/notifications/history",
    authenticateToken2,
    checkPermission("notifications:view_history"),
    async (req, res) => {
      try {
        const logs = await prismaStorage.getAllNotificationLogs();
        res.json(logs);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.get(
    "/api/notifications/scheduled",
    authenticateToken2,
    checkPermission("notifications:view_history"),
    async (req, res) => {
      try {
        const scheduled = await prismaStorage.getAllScheduledNotifications();
        res.json(scheduled);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.post(
    "/api/notifications/schedule",
    authenticateToken2,
    checkPermission("notifications:send"),
    async (req, res) => {
      try {
        const { plantillaId, smtpAccountId, destinatariosSeleccionados, fechaProgramada, recurrencia } = req.body;
        if (!plantillaId || !fechaProgramada) {
          return res.status(400).json({ error: "Faltan campos requeridos" });
        }
        const notification = await prismaStorage.createScheduledNotification({
          plantillaId,
          smtpAccountId: smtpAccountId || null,
          destinatariosSeleccionados,
          fechaProgramada: new Date(fechaProgramada),
          estado: "PENDIENTE",
          recurrencia: recurrencia || "NINGUNA",
          creadoPor: req.user.id
        });
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: "Program\xF3 notificaci\xF3n",
          modulo: "notificaciones",
          detalles: `Fecha: ${fechaProgramada}`
        });
        res.json(notification);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.patch(
    "/api/notifications/scheduled/:id",
    authenticateToken2,
    checkPermission("notifications:update"),
    async (req, res) => {
      try {
        const { id } = req.params;
        const updates = req.body;
        if (updates.fechaProgramada) {
          updates.fechaProgramada = new Date(updates.fechaProgramada);
        }
        const notification = await prismaStorage.updateScheduledNotification(id, updates);
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: "Actualiz\xF3 notificaci\xF3n programada",
          modulo: "notificaciones",
          detalles: `Notificaci\xF3n ID: ${id}`
        });
        res.json(notification);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  app2.delete(
    "/api/notifications/scheduled/:id",
    authenticateToken2,
    checkPermission("notifications:delete"),
    async (req, res) => {
      try {
        const { id } = req.params;
        await prismaStorage.deleteScheduledNotification(id);
        await prismaStorage.createActivityLog({
          usuarioId: req.user.id,
          accion: "Elimin\xF3 notificaci\xF3n programada",
          modulo: "notificaciones",
          detalles: `Notificaci\xF3n ID: ${id}`
        });
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
  io2.on("connection", (socket) => {
    const user = socket.data.user;
    console.log(`Usuario conectado: ${user.username} (${socket.id})`);
    socket.join(`user:${user.id}`);
    socket.join(`role:${user.role}`);
    let heartbeatInterval;
    let lastHeartbeat = Date.now();
    heartbeatInterval = setInterval(async () => {
      try {
        await prisma20.sessions.updateMany({
          where: { socket_id: socket.id, ended_at: null },
          data: { last_seen_at: /* @__PURE__ */ new Date() }
        });
        if (socket.connected) {
          socket.emit("heartbeat", { timestamp: Date.now() });
        } else {
          clearInterval(heartbeatInterval);
        }
      } catch (err) {
        console.error("Error en heartbeat:", err);
      }
    }, 3e4);
    socket.on("heartbeat-response", async () => {
      lastHeartbeat = Date.now();
      try {
        await prisma20.sessions.updateMany({
          where: { socket_id: socket.id, ended_at: null },
          data: { last_seen_at: /* @__PURE__ */ new Date() }
        });
      } catch (err) {
        console.error("Error actualizando heartbeat:", err);
      }
    });
    const connectedCount = io2.sockets.sockets.size;
    io2.emit("online-count", connectedCount);
    io2.emit("user:connected", {
      userId: user.id,
      username: user.username,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
    (async () => {
      try {
        const ipHeader = socket.handshake.headers["x-forwarded-for"] || "";
        const ip = ipHeader ? ipHeader.split(",")[0].trim() : socket.handshake.address;
        io2.to("role:Administrador").emit("session:new", {
          userId: user.id,
          username: user.username,
          ip,
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          socket_id: socket.id
        });
      } catch (err) {
        console.error("Error notificando nueva sesi\xF3n:", err);
      }
    })();
    (async () => {
      try {
        const ipHeader = socket.handshake.headers["x-forwarded-for"] || "";
        const ip = ipHeader ? ipHeader.split(",")[0].trim() : socket.handshake.address;
        const userAgent = String(socket.handshake.headers["user-agent"] || "");
        await prisma20.sessions.create({
          data: {
            id: randomUUID9(),
            userId: user.id,
            socket_id: socket.id,
            ip,
            user_agent: userAgent,
            last_seen_at: /* @__PURE__ */ new Date(),
            createdAt: /* @__PURE__ */ new Date()
          }
        });
        console.log(`\u2705 Sesi\xF3n creada para usuario ${user.username} (${socket.id})`);
      } catch (err) {
        console.error("\u274C Error al crear sesi\xF3n:", err);
      }
    })();
    socket.on("get:online-count", () => {
      const connectedCount2 = io2.sockets.sockets.size;
      socket.emit("online-count", connectedCount2);
    });
    socket.on("disconnect", (reason) => {
      console.log(`Usuario desconectado: ${user.username} - Raz\xF3n: ${reason}`);
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
      const isTemporaryDisconnect = reason === "client namespace disconnect" || reason === "server namespace disconnect" || reason === "ping timeout";
      if (!isTemporaryDisconnect) {
        const connectedCount2 = io2.sockets.sockets.size;
        io2.emit("online-count", connectedCount2);
        io2.emit("user:disconnected", {
          userId: user.id,
          username: user.username,
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          reason
        });
        (async () => {
          try {
            await prisma20.sessions.updateMany({
              where: { socket_id: socket.id, ended_at: null },
              data: { ended_at: /* @__PURE__ */ new Date(), last_seen_at: /* @__PURE__ */ new Date() }
            });
            console.log(`\u2705 Sesi\xF3n finalizada para usuario ${user.username} (${socket.id}) - Raz\xF3n: ${reason}`);
          } catch (err) {
            console.error("\u274C Error al finalizar sesi\xF3n:", err);
          }
        })();
      } else {
        console.log(`\u{1F504} Desconexi\xF3n temporal para usuario ${user.username} - No cerrando sesi\xF3n`);
      }
    });
  });
  httpServer.io = io2;
  setSocketIO(io2);
  return httpServer;
}

// server/vite.ts
import express8 from "express";
import fs11 from "fs";
import path15 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path14 from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      ),
      await import("@replit/vite-plugin-dev-banner").then(
        (m) => m.devBanner()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path14.resolve(import.meta.dirname, "client", "src"),
      "@shared": path14.resolve(import.meta.dirname, "shared"),
      "@assets": path14.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path14.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path14.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    // Optimizaciones de build
    target: "es2020",
    // Target más moderno para mejor optimización
    minify: "esbuild",
    // esbuild es más rápido que terser
    sourcemap: false,
    // Desactivar sourcemaps en producción acelera el build
    cssCodeSplit: true,
    // Split CSS para mejor caching
    chunkSizeWarningLimit: 1e3,
    // Aumentar límite para reducir warnings
    rollupOptions: {
      output: {
        // Optimizar chunking para mejor caching
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "ui-vendor": ["lucide-react", "@radix-ui/react-toast", "@radix-ui/react-dialog"]
        }
      }
    },
    // Optimizaciones de rendimiento
    reportCompressedSize: false,
    // No reportar tamaño comprimido (más rápido)
    assetsInlineLimit: 4096
    // Inline assets pequeños
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  },
  // Optimizaciones adicionales
  esbuild: {
    logOverride: { "this-is-undefined-in-esm": "silent" },
    // Reducir warnings
    treeShaking: true
  }
});

// server/vite.ts
import { nanoid as nanoid3 } from "nanoid";
var viteLogger = createLogger();
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path15.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs11.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid3()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path15.resolve(import.meta.dirname, "public");
  if (!fs11.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express8.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path15.resolve(distPath, "index.html"));
  });
}

// server/index.ts
init_prisma_client();
import helmet from "helmet";
import cors from "cors";

// server/jobs.ts
import cron from "node-cron";
import { PrismaClient as PrismaClient21 } from "@prisma/client";
import nodemailer7 from "nodemailer";
import { addDays, format } from "date-fns";
import { es } from "date-fns/locale";
var prisma21;
function initializeJobs(client) {
  prisma21 = client;
}
var smtpPassword = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;
if (process.env.SMTP_USER && !smtpPassword) {
  console.warn("\u26A0\uFE0F  SMTP password environment variable missing. Define SMTP_PASS or SMTP_PASSWORD.");
}
var transporter = nodemailer7.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: process.env.SMTP_USER && smtpPassword ? {
    user: process.env.SMTP_USER,
    pass: smtpPassword
  } : void 0
});
var isMailConfigured = false;
transporter.verify((error, success) => {
  if (error) {
    console.warn("\u26A0\uFE0F  SMTP no configurado - emails deshabilitados:", error.message);
    isMailConfigured = false;
  } else {
    console.log("\u2705 SMTP configurado correctamente");
    isMailConfigured = true;
  }
});
async function sendEmail(to, subject, html) {
  if (!isMailConfigured) {
    console.log(`\u{1F4E7} Email no enviado (SMTP no configurado): ${to} - ${subject}`);
    return;
  }
  try {
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to,
      subject,
      html
    });
    console.log(`\u2705 Email enviado: ${to} - ${subject}`);
  } catch (error) {
    console.error(`\u274C Error enviando email a ${to}:`, error);
  }
}
var taskRemindersJob = cron.createTask("0 9 * * *", async () => {
  console.log("\u{1F514} Ejecutando job: recordatorios de tareas");
  try {
    const tomorrow = addDays(/* @__PURE__ */ new Date(), 1);
    const nextWeek = addDays(/* @__PURE__ */ new Date(), 7);
    const upcomingTasks = await prisma21.tasks.findMany({
      where: {
        estado: { notIn: ["COMPLETADA"] },
        fecha_vencimiento: {
          gte: /* @__PURE__ */ new Date(),
          lte: nextWeek
        }
      },
      include: {
        clients: true,
        users: true
        // asignado → users
      }
    });
    console.log(`\u{1F4CB} Tareas pr\xF3ximas a vencer: ${upcomingTasks.length}`);
    for (const task of upcomingTasks) {
      if (!task.fecha_vencimiento) continue;
      const diasRestantes = Math.ceil(
        (new Date(task.fecha_vencimiento).getTime() - (/* @__PURE__ */ new Date()).getTime()) / (1e3 * 60 * 60 * 24)
      );
      if (diasRestantes <= 0) continue;
      const urgencia = diasRestantes <= 1 ? "URGENTE" : diasRestantes <= 3 ? "Pr\xF3ximo" : "Recordatorio";
      const color = diasRestantes <= 1 ? "#dc2626" : diasRestantes <= 3 ? "#f59e0b" : "#3b82f6";
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: ${color}; color: white; padding: 20px; text-align: center;">
            <h2 style="margin: 0;">${urgencia}: Tarea pr\xF3xima a vencer</h2>
          </div>
          <div style="padding: 20px; background: #f9fafb;">
            <h3>${task.titulo}</h3>
            <p><strong>Cliente:</strong> ${task.clients?.razonSocial || "Sin cliente"}</p>
            <p><strong>Descripci\xF3n:</strong> ${task.descripcion || "Sin descripci\xF3n"}</p>
            <p><strong>Vence:</strong> ${format(new Date(task.fecha_vencimiento), "dd 'de' MMMM, yyyy", { locale: es })}</p>
            <p><strong>D\xEDas restantes:</strong> ${diasRestantes}</p>
            <p><strong>Prioridad:</strong> ${task.prioridad}</p>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px;">
              Este es un recordatorio autom\xE1tico del sistema Asesor\xEDa La Llave.
            </p>
          </div>
        </div>
      `;
      if (task.users?.email) {
        await sendEmail(
          task.users.email,
          `${urgencia}: ${task.titulo} - Vence en ${diasRestantes} d\xEDa(s)`,
          html
        );
      }
    }
  } catch (error) {
    console.error("\u274C Error en job de recordatorios de tareas:", error);
  }
});
var taxRemindersJob = cron.createTask("0 8 * * *", async () => {
  console.log("\u{1F514} Ejecutando job: recordatorios fiscales");
  try {
    const now = /* @__PURE__ */ new Date();
    const nextMonth = addDays(now, 30);
    const clientes = await prisma21.clients.findMany({
      include: {
        clientTaxes: {
          include: {
            period: {
              include: {
                modelo: true
              }
            }
          }
        }
      }
    });
    console.log(`\u{1F4CA} Clientes con impuestos: ${clientes.length}`);
    for (const cliente of clientes) {
      if (!cliente.clientTaxes || cliente.clientTaxes.length === 0) continue;
      for (const clientTax of cliente.clientTaxes) {
        const period = clientTax.period;
        if (!period) continue;
        const diasRestantes = Math.ceil(
          (new Date(period.finPresentacion).getTime() - now.getTime()) / (1e3 * 60 * 60 * 24)
        );
        if ([7, 3, 1].includes(diasRestantes)) {
          const color = diasRestantes === 1 ? "#dc2626" : diasRestantes === 3 ? "#f59e0b" : "#3b82f6";
          const urgencia = diasRestantes === 1 ? "URGENTE" : "Recordatorio";
          const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: ${color}; color: white; padding: 20px; text-align: center;">
                <h2 style="margin: 0;">${urgencia}: Obligaci\xF3n Fiscal Pr\xF3xima</h2>
              </div>
              <div style="padding: 20px; background: #f9fafb;">
                <h3>${period.modelo.nombre} - ${period.anio}</h3>
                <p><strong>Cliente:</strong> ${cliente.razonSocial}</p>
                <p><strong>NIF/CIF:</strong> ${cliente.nifCif}</p>
                <p><strong>Periodo:</strong> ${period.trimestre ? `Trimestre ${period.trimestre}` : period.mes ? `Mes ${period.mes}` : period.anio}</p>
                <p><strong>Fecha l\xEDmite:</strong> ${format(new Date(period.finPresentacion), "dd 'de' MMMM, yyyy", { locale: es })}</p>
                <p><strong>D\xEDas restantes:</strong> ${diasRestantes}</p>
                <p><strong>Estado:</strong> ${clientTax.estado}</p>
                <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
                <p style="color: #6b7280; font-size: 14px;">
                  Este es un recordatorio autom\xE1tico del sistema Asesor\xEDa La Llave.
                </p>
              </div>
            </div>
          `;
          if (cliente.email) {
            await sendEmail(
              cliente.email,
              `${urgencia}: ${period.modelo.nombre} - Vence en ${diasRestantes} d\xEDa(s)`,
              html
            );
          }
        }
      }
    }
  } catch (error) {
    console.error("\u274C Error en job de recordatorios fiscales:", error);
  }
});
var taxCalendarRefreshJob = cron.createTask("0 */6 * * *", async () => {
  if (!prisma21) {
    console.warn("\u26A0\uFE0F  taxCalendarRefreshJob: Prisma no inicializado");
    return;
  }
  console.log("\u{1F5D3}\uFE0F  Ejecutando job: refresco calendario fiscal");
  try {
    const entries = await prisma21.tax_calendar.findMany();
    let updated = 0;
    for (const entry of entries) {
      const derived = calculateDerivedFields(entry.startDate, entry.endDate);
      if (entry.status !== derived.status || entry.days_to_start !== derived.daysToStart || entry.days_to_end !== derived.daysToEnd) {
        await prisma21.tax_calendar.update({
          where: { id: entry.id },
          data: {
            status: derived.status,
            days_to_start: derived.daysToStart,
            days_to_end: derived.daysToEnd
          }
        });
        updated++;
      }
    }
    console.log(`\u2705 Calendario fiscal actualizado (${updated} registros)`);
  } catch (error) {
    console.error("\u274C Error actualizando calendario fiscal:", error);
  }
});
var fiscalPeriodsStatusJob = cron.createTask("0 */6 * * *", async () => {
  if (!prisma21) {
    console.warn("\u26A0\uFE0F  fiscalPeriodsStatusJob: Prisma no inicializado");
    return;
  }
  console.log("\u{1F4C5} Ejecutando job: actualizaci\xF3n de estados de per\xEDodos fiscales");
  try {
    const now = /* @__PURE__ */ new Date();
    now.setHours(0, 0, 0, 0);
    const periods = await prisma21.fiscal_periods.findMany({
      select: {
        id: true,
        starts_at: true,
        ends_at: true,
        status: true
      }
    });
    let toOpen = 0;
    let toClosed = 0;
    for (const period of periods) {
      const startsAt = new Date(period.starts_at);
      const endsAt = new Date(period.ends_at);
      startsAt.setHours(0, 0, 0, 0);
      endsAt.setHours(0, 0, 0, 0);
      let newStatus = null;
      if (now >= startsAt && now <= endsAt) {
        if (period.status !== "OPEN") {
          newStatus = "OPEN";
          toOpen++;
        }
      } else if (now > endsAt) {
        if (period.status !== "CLOSED") {
          newStatus = "CLOSED";
          toClosed++;
        }
      }
      if (newStatus && newStatus !== period.status) {
        await prisma21.fiscal_periods.update({
          where: { id: period.id },
          data: { status: newStatus }
        });
      }
    }
    console.log(`\u2705 Estados de per\xEDodos actualizados: ${toOpen} abiertos, ${toClosed} cerrados`);
  } catch (error) {
    console.error("\u274C Error actualizando estados de fiscal_periods:", error);
  }
});
var ensureDeclarationsDailyJob = cron.createTask("10 1 * * *", async () => {
  const year = (/* @__PURE__ */ new Date()).getFullYear();
  try {
    const result = await prismaStorage.ensureDeclarationsForYear(year);
    console.log(`\u{1F9E9} ensureDeclarationsDailyJob: a\xF1o ${year} => creadas ${result.created}, omitidas ${result.skipped}`);
  } catch (e) {
    console.error("\u274C Error en ensureDeclarationsDailyJob:", e);
  }
});
var ensureTaxFilingsJob = cron.createTask("10 * * * *", async () => {
  try {
    const now = /* @__PURE__ */ new Date();
    const currentYear = now.getFullYear();
    const years = [currentYear];
    if (now.getMonth() >= 9) {
      years.push(currentYear + 1);
    }
    for (const year of years) {
      const result = await prismaStorage.ensureClientTaxFilingsForYear(year);
      console.log(`\u{1F4C7} ensureTaxFilingsJob: sincronizado a\xF1o ${year} (${result.generated} periodos revisados)`);
    }
  } catch (error) {
    console.error("\u274C Error en ensureTaxFilingsJob:", error);
  }
});
var cleanupSessionsJob = cron.createTask("0 * * * *", async () => {
  console.log("\u{1F9F9} Ejecutando job: limpieza de sesiones");
  try {
    const prisma22 = new PrismaClient21();
    const sevenDaysAgo = /* @__PURE__ */ new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const closedSessionsResult = await prisma22.sessions.deleteMany({
      where: {
        ended_at: {
          not: null,
          lt: sevenDaysAgo
        }
      }
    });
    const twoHoursAgo = /* @__PURE__ */ new Date();
    twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);
    const inactiveSessionsResult = await prisma22.sessions.updateMany({
      where: {
        ended_at: null,
        last_seen_at: { lt: twoHoursAgo }
      },
      data: {
        ended_at: /* @__PURE__ */ new Date()
      }
    });
    console.log(`\u2705 Sesiones limpias: ${closedSessionsResult.count} eliminadas, ${inactiveSessionsResult.count} marcadas como inactivas`);
    await prisma22.$disconnect();
  } catch (error) {
    console.error("\u274C Error en job de limpieza:", error);
  }
});
var backupDatabaseJob = cron.createTask("0 3 * * *", async () => {
  console.log("\u{1F4BE} Ejecutando job: backup de base de datos");
  try {
    const { spawn } = __require("child_process");
    const path16 = __require("path");
    const backupScript = path16.join(process.cwd(), "scripts", "backup.sh");
    const backup = spawn("bash", [backupScript], {
      env: process.env,
      stdio: "inherit"
    });
    backup.on("close", (code) => {
      if (code === 0) {
        console.log("\u2705 Backup completado exitosamente");
      } else {
        console.error(`\u274C Backup fall\xF3 con c\xF3digo: ${code}`);
      }
    });
  } catch (error) {
    console.error("\u274C Error en job de backup:", error);
  }
});
function startAllJobs() {
  if (!prisma21) {
    throw new Error(
      "\u274C JOBS ERROR: Prisma client no inicializado.\n   Debe llamar a initializeJobs(prisma) antes de startAllJobs().\n   Ver server/index.ts para el orden correcto de inicializaci\xF3n."
    );
  }
  const isDev2 = process.env.NODE_ENV !== "production";
  const enableCronJobs = process.env.ENABLE_CRON_JOBS === "true";
  if (!isDev2 && !enableCronJobs) {
    console.warn(
      "\u26A0\uFE0F  ADVERTENCIA: Cron jobs deshabilitados en este entorno.\n   Los Autoscale Deployments no soportan procesos persistentes.\n   Use Scheduled Deployments de Replit para tareas programadas.\n   O configure ENABLE_CRON_JOBS=true en Reserved VM Deployments.\n   Documentaci\xF3n: https://docs.replit.com/hosting/deployments/scheduled-deployments"
    );
    return;
  }
  console.log("\u{1F680} Iniciando jobs programados...");
  taskRemindersJob.start();
  console.log("  \u2713 Recordatorios de tareas (09:00 diario)");
  taxRemindersJob.start();
  console.log("  \u2713 Recordatorios fiscales (08:00 diario)");
  taxCalendarRefreshJob.start();
  console.log("  \u2713 Actualizaci\xF3n de calendario fiscal (cada 6 horas)");
  fiscalPeriodsStatusJob.start();
  console.log("  \u2713 Actualizaci\xF3n de estados de per\xEDodos (cada 6 horas)");
  ensureTaxFilingsJob.start();
  console.log("  \u2713 Sincronizaci\xF3n de tarjetas fiscales (cada hora)");
  cleanupSessionsJob.start();
  console.log("  \u2713 Limpieza de sesiones (cada hora)");
  backupDatabaseJob.start();
  console.log("  \u2713 Backup autom\xE1tico (03:00 diario)");
  console.log("\u2705 Todos los jobs activos");
}
function stopAllJobs() {
  if (!prisma21) {
    throw new Error("Jobs no inicializados: debe llamar initializeJobs(prisma) primero");
  }
  taskRemindersJob.stop();
  taxRemindersJob.stop();
  taxCalendarRefreshJob.stop();
  fiscalPeriodsStatusJob.stop();
  ensureTaxFilingsJob.stop();
  cleanupSessionsJob.stop();
  backupDatabaseJob.stop();
  console.log("\u{1F6D1} Todos los jobs detenidos");
}

// server/index.ts
import bcrypt2 from "bcrypt";

// server/middleware/security-validation.ts
function validateJWTSecret() {
  const jwtSecret = process.env.JWT_SECRET;
  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction && !jwtSecret) {
    throw new Error(
      `
\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557
\u2551  \u274C ERROR CR\xCDTICO DE SEGURIDAD: JWT_SECRET NO CONFIGURADO             \u2551
\u2560\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2563
\u2551                                                                       \u2551
\u2551  En producci\xF3n, JWT_SECRET es OBLIGATORIO y debe ser una cadena      \u2551
\u2551  aleatoria fuerte de al menos 64 caracteres.                         \u2551
\u2551                                                                       \u2551
\u2551  Configura JWT_SECRET en tu archivo .env con un valor \xFAnico:         \u2551
\u2551                                                                       \u2551
\u2551  Genera uno con:                                                      \u2551
\u2551    node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"  \u2551
\u2551                                                                       \u2551
\u2551  O:                                                                   \u2551
\u2551    openssl rand -hex 64                                               \u2551
\u2551                                                                       \u2551
\u2551  El servidor se detendr\xE1 por seguridad.                               \u2551
\u2551                                                                       \u2551
\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D
`
    );
  }
  const forbiddenSecrets = [
    "your-secret-key-change-this-in-production",
    "your-secret-key",
    "change-this-in-production",
    "change_this_in_production",
    "secret",
    "jwt-secret",
    "jwt_secret",
    "123456",
    "password",
    "admin",
    "test",
    "development",
    "prod",
    "production"
  ];
  if (jwtSecret && forbiddenSecrets.some((forbidden) => jwtSecret.toLowerCase().includes(forbidden))) {
    throw new Error(
      `
\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557
\u2551  \u274C ERROR CR\xCDTICO DE SEGURIDAD: JWT_SECRET INSEGURO                   \u2551
\u2560\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2563
\u2551                                                                       \u2551
\u2551  El JWT_SECRET actual contiene un valor de ejemplo o predecible.     \u2551
\u2551  Esto compromete COMPLETAMENTE la seguridad de la aplicaci\xF3n.        \u2551
\u2551                                                                       \u2551
\u2551  Valor detectado: ${jwtSecret.substring(0, 20)}...                    \u2551
\u2551                                                                       \u2551
\u2551  DEBES cambiar JWT_SECRET a un valor aleatorio \xFAnico.                \u2551
\u2551                                                                       \u2551
\u2551  Genera uno seguro con:                                               \u2551
\u2551    node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"  \u2551
\u2551                                                                       \u2551
\u2551  El servidor se detendr\xE1 por seguridad.                               \u2551
\u2551                                                                       \u2551
\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D
`
    );
  }
  if (isProduction && jwtSecret && jwtSecret.length < 64) {
    throw new Error(
      `
\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557
\u2551  \u26A0\uFE0F  ADVERTENCIA DE SEGURIDAD: JWT_SECRET DEMASIADO CORTO            \u2551
\u2560\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2563
\u2551                                                                       \u2551
\u2551  JWT_SECRET actual: ${jwtSecret.length} caracteres                   \u2551
\u2551  Longitud m\xEDnima recomendada: 64 caracteres                          \u2551
\u2551                                                                       \u2551
\u2551  Un secret corto puede ser vulnerable a ataques de fuerza bruta.     \u2551
\u2551                                                                       \u2551
\u2551  Genera uno de 64+ caracteres con:                                   \u2551
\u2551    node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"  \u2551
\u2551                                                                       \u2551
\u2551  El servidor se detendr\xE1 por seguridad.                               \u2551
\u2551                                                                       \u2551
\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D
`
    );
  }
  if (!isProduction && (!jwtSecret || jwtSecret === "your-secret-key-change-this-in-production")) {
    console.warn(
      "\n\u26A0\uFE0F  ADVERTENCIA: Usando JWT_SECRET por defecto en desarrollo.\nEsto es aceptable SOLO en desarrollo local.\nEn producci\xF3n, esto ser\xEDa un ERROR CR\xCDTICO DE SEGURIDAD.\n"
    );
  }
}
function validateSecurityConfig() {
  validateJWTSecret();
  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction && !process.env.DATABASE_URL) {
    throw new Error("ERROR CR\xCDTICO: DATABASE_URL no configurado en producci\xF3n");
  }
  if (isProduction && !process.env.FRONTEND_URL) {
    console.warn("\u26A0\uFE0F  ADVERTENCIA: FRONTEND_URL no configurado en producci\xF3n. CORS podr\xEDa fallar.");
  }
  console.log("\u2705 Validaciones de seguridad completadas exitosamente");
}

// server/index.ts
import { randomUUID as randomUUID10 } from "crypto";
var SALT_ROUNDS2 = 10;
var app = express9();
validateSecurityConfig();
app.set("trust proxy", 1);
var dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  logger.fatal("\n\n\u274C FATAL: DATABASE_URL no est\xE1 configurada. Este proyecto requiere una base de datos MariaDB externa.\nPor favor a\xF1ade DATABASE_URL en tu archivo .env con el formato:\n  mysql://USER:PASS@HOST:3306/asesoria_llave?socket_timeout=60&connect_timeout=60\no\n  mariadb://USER:PASS@HOST:3306/asesoria_llave\n\n");
  process.exit(1);
}
if (!/^mysql:\/\//i.test(dbUrl) && !/^mariadb:\/\//i.test(dbUrl)) {
  logger.fatal(`

\u274C FATAL: DATABASE_URL debe usar el driver MySQL/MariaDB (mysql:// o mariadb://).
Valor actual: ${dbUrl}
Aseg\xFArate de usar MariaDB como base de datos externa.

`);
  process.exit(1);
}
try {
  const parsed = new URL(dbUrl);
  const host = parsed.hostname;
  const allowLocal = process.env.ALLOW_LOCAL_DB === "true";
  const localHosts = ["localhost", "127.0.0.1", "::1", "db"];
  if (!allowLocal && localHosts.includes(host)) {
    logger.fatal(`

\u274C FATAL: Se requiere una base de datos MariaDB EXTERNA.
DATABASE_URL apunta a un host local/internal: ${host}
Si quieres permitir uso de una base de datos local (ej. docker-compose) define ALLOW_LOCAL_DB=true en tu .env

`);
    process.exit(1);
  }
} catch (e) {
  logger.warn({ err: e }, "No se pudo parsear DATABASE_URL para validaci\xF3n de host");
}
var isDev = process.env.NODE_ENV === "development";
if (isDev) {
  prisma_client_default.$on("query", (e) => {
    dbLogger.debug({ duration: e.duration, query: e.query }, "Database query");
  });
}
prisma_client_default.$on("error", (e) => {
  dbLogger.error({ target: e.target }, e.message);
});
prisma_client_default.$on("warn", (e) => {
  dbLogger.warn({ target: e.target }, e.message);
});
app.use(helmet({
  contentSecurityPolicy: isDev ? false : {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  hsts: {
    maxAge: 31536e3,
    includeSubDomains: true,
    preload: true
  },
  referrerPolicy: {
    policy: "strict-origin-when-cross-origin"
  }
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || (isDev ? "*" : false),
  credentials: true
}));
app.use(express9.json({ limit: "10mb" }));
app.use(express9.urlencoded({ extended: false, limit: "10mb" }));
app.use("/uploads", express9.static("uploads"));
app.use(httpLogger);
app.get("/health", async (_req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    uptime: process.uptime()
  });
});
app.get("/ready", async (_req, res) => {
  try {
    await prisma_client_default.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: "ready",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      database: "connected",
      s3: process.env.S3_ENDPOINT ? "configured" : "not configured",
      smtp: process.env.SMTP_HOST ? "configured" : "not configured"
    });
  } catch (error) {
    logger.error({ err: error }, "Readiness check failed");
    res.status(503).json({
      status: "not ready",
      database: "disconnected",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});
async function createInitialAdmin() {
  try {
    const adminRole = await prisma_client_default.roles.findFirst({
      where: { name: "Administrador" },
      select: {
        id: true,
        name: true,
        description: true,
        is_system: true,
        createdAt: true,
        updatedAt: true
      }
    });
    if (!adminRole) {
      logger.warn("\u26A0\uFE0F  Rol Administrador no encontrado. Ejecuta las migraciones primero.");
      return;
    }
    const existingAdmin = await prisma_client_default.users.findFirst({
      where: { roleId: adminRole.id }
    });
    if (existingAdmin) {
      logger.info("\u2139\uFE0F  Usuario administrador ya existe en el sistema");
      return;
    }
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminEmail || !adminUsername || !adminPassword) {
      logger.fatal(
        "\n\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557\n\u2551  \u274C ERROR CR\xCDTICO: CONFIGURACI\xD3N DE ADMINISTRADOR REQUERIDA           \u2551\n\u2560\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2563\n\u2551                                                                       \u2551\n\u2551  No existe ning\xFAn usuario administrador en el sistema y las           \u2551\n\u2551  variables de entorno no est\xE1n configuradas.                          \u2551\n\u2551                                                                       \u2551\n\u2551  Configura las siguientes variables en tu archivo .env:              \u2551\n\u2551                                                                       \u2551\n\u2551    ADMIN_EMAIL=tu-email@ejemplo.com                                   \u2551\n\u2551    ADMIN_USERNAME=tu-usuario                                          \u2551\n\u2551    ADMIN_PASSWORD=tu-contrase\xF1a-segura                                \u2551\n\u2551                                                                       \u2551\n\u2551  Requisitos:                                                          \u2551\n\u2551    - Email v\xE1lido (debe contener @)                                   \u2551\n\u2551    - Usuario m\xEDnimo 3 caracteres                                      \u2551\n\u2551    - Contrase\xF1a m\xEDnimo 6 caracteres                                   \u2551\n\u2551                                                                       \u2551\n\u2551  El servidor se detendr\xE1 por seguridad.                               \u2551\n\u2551                                                                       \u2551\n\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D\n"
      );
      process.exit(1);
    }
    const validationErrors = [];
    const forbiddenPlaceholders = {
      email: [
        "CAMBIAR_ESTE_EMAIL@ejemplo.com",
        "CAMBIAR_ESTE_EMAIL@EJEMPLO.COM",
        "admin@asesoriallave.com",
        // Old example
        "admin@tuempresa.com"
        // Documentation example
      ],
      username: [
        "CAMBIAR_ESTE_USUARIO",
        "admin",
        // Common default
        "administrator",
        // Common default
        "root"
        // Common default
      ],
      password: [
        "CAMBIAR_ESTA_CONTRASE\xD1A_AHORA",
        "CAMBIAR_ESTA_CONTRASENA_AHORA",
        // Without tilde
        "Admin123!",
        // Old example
        "admin123",
        // Common weak
        "password",
        // Common weak
        "password123",
        // Common weak
        "CambiaEstoAhora123!"
        // Documentation example
      ]
    };
    if (forbiddenPlaceholders.email.some((p) => p.toLowerCase() === adminEmail.toLowerCase())) {
      validationErrors.push("- ADMIN_EMAIL es un valor de ejemplo. Usa un email real \xFAnico.");
    }
    if (forbiddenPlaceholders.username.some((p) => p.toLowerCase() === adminUsername.toLowerCase())) {
      validationErrors.push("- ADMIN_USERNAME es un valor de ejemplo o com\xFAn. Usa un usuario \xFAnico.");
    }
    if (forbiddenPlaceholders.password.some((p) => p.toLowerCase() === adminPassword.toLowerCase())) {
      validationErrors.push("- ADMIN_PASSWORD es un valor de ejemplo o muy d\xE9bil. Usa una contrase\xF1a segura \xFAnica.");
    }
    if (adminUsername.length < 3) {
      validationErrors.push("- ADMIN_USERNAME debe tener al menos 3 caracteres");
    }
    if (adminPassword.length < 6) {
      validationErrors.push("- ADMIN_PASSWORD debe tener al menos 6 caracteres");
    }
    if (!adminEmail.includes("@") || !adminEmail.includes(".")) {
      validationErrors.push("- ADMIN_EMAIL debe ser un email v\xE1lido (ejemplo: admin@ejemplo.com)");
    }
    if (validationErrors.length > 0) {
      logger.fatal(
        `
\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557
\u2551  \u274C ERROR: CREDENCIALES DE ADMINISTRADOR INV\xC1LIDAS                    \u2551
\u2560\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2563
\u2551                                                                       \u2551
\u2551  ${validationErrors.join("\n\u2551  ")}                                   \u2551
\u2551                                                                       \u2551
\u2551  Corrige las variables en tu archivo .env y reinicia el servidor.    \u2551
\u2551                                                                       \u2551
\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D
`
      );
      process.exit(1);
    }
    const existingUser = await prisma_client_default.users.findFirst({
      where: {
        OR: [
          { email: adminEmail },
          { username: adminUsername }
        ]
      }
    });
    if (existingUser) {
      logger.fatal(
        `
\u274C ERROR: Usuario con email ${adminEmail} o username ${adminUsername} ya existe.
   Usa credenciales diferentes para el administrador inicial.
`
      );
      process.exit(1);
    }
    const hashedPassword = await bcrypt2.hash(adminPassword, SALT_ROUNDS2);
    const adminUser = await prisma_client_default.users.create({
      data: {
        id: randomUUID10(),
        username: adminUsername,
        email: adminEmail,
        password: hashedPassword,
        roleId: adminRole.id,
        is_owner: true
        // Mark as owner
      }
    });
    logger.info(
      `
\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557
\u2551  \u2705 ADMINISTRADOR INICIAL CREADO EXITOSAMENTE                         \u2551
\u2560\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2563
\u2551                                                                       \u2551
\u2551  Usuario: ${adminUser.username.padEnd(56)} \u2551
\u2551  Email:   ${adminUser.email.padEnd(56)} \u2551
\u2551                                                                       \u2551
\u2551  \u{1F510} IMPORTANTE: Cambia la contrase\xF1a despu\xE9s del primer login         \u2551
\u2551                                                                       \u2551
\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D
`
    );
  } catch (error) {
    const msg = error?.message || String(error);
    logger.error({ err: error }, "\u26A0\uFE0F No se pudo crear usuario administrador inicial");
    if (msg.includes("Can't reach database server") || msg.includes("PrismaClientInitializationError")) {
      logger.warn("DB no disponible. Continuando arranque para permitir trabajo de frontend/API stub.");
      return;
    }
    return;
  }
}
(async () => {
  await createInitialAdmin();
  async function waitForDatabase(retries = 5, delayMs = 2e3) {
    for (let i = 0; i < retries; i++) {
      try {
        await prisma_client_default.$queryRaw`SELECT 1`;
        return true;
      } catch (err) {
        logger.warn({ attempt: i + 1, err }, `DB not available yet (attempt ${i + 1}/${retries})`);
        if (i < retries - 1) {
          await new Promise((r) => setTimeout(r, delayMs));
        }
      }
    }
    return false;
  }
  const dbRetries = Number(process.env.DB_CONNECT_RETRIES || "5");
  const dbDelay = Number(process.env.DB_CONNECT_DELAY_MS || "2000");
  const dbAvailable = await waitForDatabase(dbRetries, dbDelay);
  if (!dbAvailable) {
    const force = process.env.FORCE_START_WITHOUT_DB === "true";
    if (!force) {
      logger.fatal({ retries: dbRetries }, "No se pudo conectar a la base de datos. Aborting startup. Set FORCE_START_WITHOUT_DB=true to bypass.");
      process.exit(1);
    }
    logger.warn("FORCE_START_WITHOUT_DB=true \u2014 arrancando en modo degradado sin inicializar ciertas dependencias de DB");
  }
  initializeJobs(prisma_client_default);
  const enableCronJobs = process.env.ENABLE_CRON_JOBS === "true";
  if (isDev || enableCronJobs) {
    try {
      startAllJobs();
      logger.info("\u2705 Cron jobs iniciados");
    } catch (error) {
      logger.error({ err: error }, "Error iniciando jobs");
    }
  } else {
    logger.info(
      "\u2139\uFE0F  Cron jobs deshabilitados (entorno Autoscale). Use Scheduled Deployments de Replit para tareas programadas."
    );
  }
  const server = await registerRoutes(app, { skipDbInit: !dbAvailable });
  app.use((err, req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    logError(err, {
      requestId: req.id,
      method: req.method,
      url: req.url,
      status
    });
    res.status(status).json({
      error: message,
      ...isDev && { stack: err.stack }
    });
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  const listenOptions = {
    port,
    host: "0.0.0.0"
  };
  if (process.platform === "linux") {
    listenOptions.reusePort = true;
  }
  const maxAttempts = 10;
  let attempts = 0;
  const startPort = port;
  const tryListen = (p) => {
    attempts += 1;
    const opts = { ...listenOptions, port: p };
    const onError = (err) => {
      if (err && err.code === "EADDRINUSE") {
        logger.warn({ port: p }, `Puerto ${p} en uso, intentando puerto ${p + 1}...`);
        if (attempts <= maxAttempts) {
          setTimeout(() => tryListen(p + 1), 200);
          return;
        }
      }
      logger.fatal({ err }, `Error iniciando servidor en puerto ${p}`);
      process.exit(1);
    };
    const onListening = () => {
      server.removeListener("error", onError);
      const addr = server.address();
      const boundPort = typeof addr === "object" && addr ? addr.port : p;
      logger.info({
        port: boundPort,
        env: process.env.NODE_ENV,
        nodeVersion: process.version,
        reusePort: Boolean(listenOptions.reusePort)
      }, `\u{1F680} Server listening on port ${boundPort}`);
    };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(opts);
  };
  tryListen(startPort);
  const shutdown = async (signal) => {
    logger.info(`${signal} received, shutting down gracefully...`);
    server.close(() => {
      logger.info("HTTP server closed");
    });
    if (isDev || enableCronJobs) {
      try {
        stopAllJobs();
      } catch (error) {
        logger.error({ err: error }, "Error deteniendo jobs");
      }
    }
    await prisma_client_default.$disconnect();
    logger.info("Database connection closed");
    process.exit(0);
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
})();
