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

// Diccionario Español -> Inglés
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
    "cetirizina": "cetirizine"
};

// Función para traducir
async function traducir(texto) {
    if (!texto || texto === "No disponible") {
        return "No disponible";
    }

    try {
        return await translate(texto, { to: "es" });
    } catch (error) {
        console.log("Error al traducir:", error.message);
        return texto;
    }
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
                "No disponible",

            interacciones: []
        };

        // Traducir información
        medicamento.marca =
            await traducir(medicamento.marca);

        medicamento.indicaciones =
            await traducir(medicamento.indicaciones);

        medicamento.advertencias =
            await traducir(medicamento.advertencias);

        // Buscar interacciones en RxNav
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
                                await traducir(par.description);

                            medicamento.interacciones.push(
                                descripcion
                            );
                        }
                    }
                }
            }

        } catch (error) {

            console.log(
                "No se pudieron obtener interacciones."
            );
        }

        if (medicamento.interacciones.length === 0) {

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

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(
        `Servidor ejecutándose en puerto ${PORT}`
    );
});