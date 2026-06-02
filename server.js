const express = require("express");
const axios = require("axios");
const cors = require("cors");
const path = require("path");
const translate = require("translate-google");

const app = express();

app.use(cors());
app.use(express.json());

// Servir frontend
app.use(express.static(path.join(__dirname, "frontend")));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "frontend", "index.html"));
});

// Español -> Inglés
const traducciones = {
    "ibuprofeno": "ibuprofen",
    "paracetamol": "acetaminophen",
    "aspirina": "aspirin",
    "amoxicilina": "amoxicillin",
    "diclofenaco": "diclofenac",
    "naproxeno": "naproxen",
    "omeprazol": "omeprazole",
    "metformina": "metformin",
    "losartan": "losartan",
    "losartán": "losartan",
    "cetirizina": "cetirizine",
    "enalapril": "enalapril"
};

// Traducción segura
async function traducir(texto) {

    if (!texto || texto === "No disponible") {
        return "No disponible";
    }

    try {

        // Traducción normal
        if (texto.length < 2500) {
            return await translate(texto, { to: "es" });
        }

        // Traducción por bloques
        let resultado = "";

        for (let i = 0; i < texto.length; i += 2000) {

            const bloque = texto.substring(i, i + 2000);

            try {

                const traducido =
                    await translate(bloque, { to: "es" });

                resultado += traducido + " ";

            } catch {

                resultado += bloque + " ";
            }
        }

        return resultado;

    } catch {

        return texto;
    }
}

// Resumir advertencias
function resumirAdvertencias(texto) {

    if (!texto || texto === "No disponible") {
        return texto;
    }

    const frases =
        texto.split(".").filter(f => f.trim() !== "");

    return frases.slice(0, 8).join(". ") + ".";
}

app.get("/medicamento/:nombre", async (req, res) => {

    try {

        const nombreUsuario =
            req.params.nombre.toLowerCase().trim();

        const nombreAPI =
            traducciones[nombreUsuario] ||
            nombreUsuario;

        // OpenFDA
        const respuestaFDA = await axios.get(
            `https://api.fda.gov/drug/label.json?search=openfda.generic_name:${nombreAPI}&limit=1`
        );

        const med = respuestaFDA.data.results[0];

        let medicamento = {

            nombre:
                nombreUsuario.charAt(0).toUpperCase() +
                nombreUsuario.slice(1),

            marca:
                med.openfda?.brand_name?.[0] ||
                "No disponible",

            indicaciones:
                med.indications_and_usage?.[0] ||
                "No disponible",

            advertencias:
                med.warnings?.[0] ||
                med.boxed_warning?.[0] ||
                "No disponible",

            interacciones: []
        };

        // Traducciones
        medicamento.marca =
            await traducir(medicamento.marca);

        medicamento.indicaciones =
            await traducir(medicamento.indicaciones);

        medicamento.advertencias =
            await traducir(
                resumirAdvertencias(
                    medicamento.advertencias
                )
            );

        // RxNav
        try {

            const rxcuiResp = await axios.get(
                `https://rxnav.nlm.nih.gov/REST/rxcui.json?name=${nombreAPI}`
            );

            const rxcui =
                rxcuiResp.data.idGroup?.rxnormId?.[0];

            if (rxcui) {

                const interaccionesResp = await axios.get(
                    `https://rxnav.nlm.nih.gov/REST/interaction/interaction.json?rxcui=${rxcui}`
                );

                const grupos =
                    interaccionesResp.data.interactionTypeGroup || [];

                for (const grupo of grupos) {

                    for (const tipo of grupo.interactionType || []) {

                        for (const par of tipo.interactionPair || []) {

                            let descripcion =
                                await traducir(
                                    par.description
                                );

                            medicamento.interacciones.push(
                                descripcion
                            );

                            // Máximo 10
                            if (
                                medicamento.interacciones.length >= 10
                            ) {
                                break;
                            }
                        }
                    }
                }
            }

        } catch {

            console.log(
                "No se encontraron interacciones."
            );
        }

        if (
            medicamento.interacciones.length === 0
        ) {

            medicamento.interacciones.push(
                "No se encontraron interacciones registradas."
            );
        }

        res.json(medicamento);

    } catch (error) {

        console.error(error.message);

        res.status(404).json({
            mensaje:
                "Medicamento no encontrado. Intente con otro nombre."
        });
    }
});

const PORT =
    process.env.PORT || 3000;

app.listen(PORT, () => {

    console.log(
        `Servidor ejecutándose en puerto ${PORT}`
    );
});