// backend/controllers/sunatController.js
import { enviarFacturaASunat } from "../services/sunatService.js";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

// =================== FUNCIONES EXISTENTES ===================
export const reenviarASunat = async (req, res) => {
  const { zipPath, nombreArchivo } = req.body;
  try {
    const resultado = await enviarFacturaASunat(zipPath, nombreArchivo);
    res.json(resultado);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// =================== CONSULTA RUC/DNI ===================

// Token de API de apisperu.com
const tokenAPISPERU = process.env.APISPERU_TOKEN;

// -------- CONSULTA RUC --------
const consultarRUCConFallback = async (ruc) => {
  const apis = [
    {
      name: "apis.net.pe",
      url: `https://api.apis.net.pe/v2/sunat/ruc/full?numero=${ruc}`,
      headers: { Authorization: "" },
      transform: (data) => ({
        numero: ruc,
        tipoDocumento: "RUC",
        razonSocial: data.nombre || "",
        nombre: data.nombre || "",
        estado: data.estado || "",
        condicion: data.condicion || "",
        direccion: data.direccion || "",
        departamento: data.departamento || "",
        provincia: data.provincia || "",
        distrito: data.distrito || "",
        ubigeo: data.ubigeo || "",
      }),
    },
    {
      name: "apiperu.dev",
      url: `https://apiperu.dev/api/ruc/${ruc}`,
      headers: { Authorization: "" },
      transform: (data) => ({
        numero: ruc,
        tipoDocumento: "RUC",
        razonSocial: data.data?.nombre_o_razon_social || "",
        nombre: data.data?.nombre_o_razon_social || "",
        estado: data.data?.estado || "",
        condicion: data.data?.condicion || "",
        direccion: data.data?.direccion || "",
        departamento: data.data?.departamento || "",
        provincia: data.data?.provincia || "",
        distrito: data.data?.distrito || "",
        ubigeo: data.data?.ubigeo || "",
      }),
    },
    {
      name: "dniruc.apisperu.com",
      url: `https://dniruc.apisperu.com/api/v1/ruc/${ruc}`,
      headers: { Authorization: `Bearer ${tokenAPISPERU}` },
      transform: (data) => ({
        numero: ruc,
        tipoDocumento: "RUC",
        razonSocial: data.razonSocial || "",
        nombre: data.razonSocial || "",
        estado: data.estado || "",
        condicion: data.condicion || "",
        direccion: data.direccion || "",
        departamento: data.departamento || "",
        provincia: data.provincia || "",
        distrito: data.distrito || "",
        ubigeo: data.ubigeo || "",
      }),
    },
  ];

  let lastError = null;

  for (const api of apis) {
    try {
      console.log(`🔍 Consultando RUC en ${api.name}...`);
      const response = await axios.get(api.url, {
        timeout: 8000,
        headers: {
          ...api.headers,
          Accept: "application/json",
          "User-Agent": "Mozilla/5.0",
        },
      });

      if (
        response.data &&
        (response.data.nombre ||
          response.data.razonSocial ||
          response.data.data)
      ) {
        const datos = api.transform(response.data);
        if (datos.razonSocial && datos.razonSocial.trim() !== "") {
          console.log(`✅ RUC encontrado en ${api.name}`);
          return { success: true, data: datos };
        }
      }
    } catch (error) {
      console.log(`❌ Error en ${api.name}:`, error.message);
      lastError = error;
    }
  }

  throw lastError || new Error("No se pudo consultar el RUC en ninguna API");
};

// -------- CONSULTA DNI --------
const consultarDNIConFallback = async (dni) => {
  const apis = [
    {
      name: "apis.net.pe",
      url: `https://api.apis.net.pe/v2/reniec/dni?numero=${dni}`,
      headers: { Authorization: "" },
      transform: (data) => {
        const nombreCompleto = `${data.nombres || ""} ${data.apellidoPaterno || ""} ${data.apellidoMaterno || ""}`.trim();
        return {
          numero: dni,
          tipoDocumento: "DNI",
          nombre: nombreCompleto,
          razonSocial: nombreCompleto,
          estado: "ACTIVO",
          condicion: "HABIDO",
        };
      },
    },
    {
      name: "apiperu.dev",
      url: `https://apiperu.dev/api/dni/${dni}`,
      headers: { Authorization: "" },
      transform: (data) => {
        const nombreCompleto = data.data?.nombre_completo || "";
        return {
          numero: dni,
          tipoDocumento: "DNI",
          nombre: nombreCompleto,
          razonSocial: nombreCompleto,
          estado: "ACTIVO",
          condicion: "HABIDO",
        };
      },
    },
    {
      name: "dniruc.apisperu.com",
      url: `https://dniruc.apisperu.com/api/v1/dni/${dni}`,
      headers: { Authorization: `Bearer ${tokenAPISPERU}` },
      transform: (data) => {
        const nombreCompleto = `${data.nombres || ""} ${data.apellidoPaterno || ""} ${data.apellidoMaterno || ""}`.trim();
        return {
          numero: dni,
          tipoDocumento: "DNI",
          nombre: nombreCompleto,
          razonSocial: nombreCompleto,
          estado: "ACTIVO",
          condicion: "HABIDO",
        };
      },
    },
  ];

  let lastError = null;

  for (const api of apis) {
    try {
      console.log(`🔍 Consultando DNI en ${api.name}...`);
      const response = await axios.get(api.url, {
        timeout: 8000,
        headers: {
          ...api.headers,
          Accept: "application/json",
          "User-Agent": "Mozilla/5.0",
        },
      });

      if (
        response.data &&
        (response.data.nombres ||
          response.data.nombre_completo ||
          response.data.data)
      ) {
        const datos = api.transform(response.data);
        if (datos.nombre && datos.nombre.trim() !== "") {
          console.log(`✅ DNI encontrado en ${api.name}`);
          return { success: true, data: datos };
        }
      }
    } catch (error) {
      console.log(`❌ Error en ${api.name}:`, error.message);
      lastError = error;
    }
  }

  throw lastError || new Error("No se pudo consultar el DNI en ninguna API");
};

// -------- CONTROLADOR PRINCIPAL --------
export const consultarRUC = async (req, res) => {
  try {
    const { numero } = req.body;

    if (!numero)
      return res
        .status(400)
        .json({ success: false, message: "Debe proporcionar un número" });

    const numeroLimpio = numero.toString().trim();

    if (numeroLimpio.length !== 8 && numeroLimpio.length !== 11)
      return res.status(400).json({
        success: false,
        message: "El número debe tener 8 dígitos (DNI) o 11 (RUC)",
      });

    const resultado =
      numeroLimpio.length === 11
        ? await consultarRUCConFallback(numeroLimpio)
        : await consultarDNIConFallback(numeroLimpio);

    res.status(200).json(resultado);
  } catch (error) {
    console.error("❌ Error en consultarRUC:", error.message);
    res.status(500).json({
      success: false,
      message: "Error al consultar los datos",
      error: error.message,
    });
  }
};
