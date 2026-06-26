import { validarConexaoDatajud } from "../src/lib/datajud.js";

const r = await validarConexaoDatajud();
console.log(JSON.stringify(r, null, 2));
