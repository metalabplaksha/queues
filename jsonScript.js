const prefabA = [
    "CutterPrefab", "DrillerPrefab", "MaskingPrefab",
    "EtcherPrefab", "SolderMaskingPrefab", "TesterPrefab",
    "ComponentsPlacerPrefab"
];

const prefabB = [
    "HalfBoard", "DrilledBoard", "MaskedBoard",
    "EtchedBoard", "SolderMaskedBoard", "SolderMaskedBoard",
    "ComponentsPlacedBoard"
];

let levelCounter = 1;

function addLevel() {
    if (levelCounter > 7) {
        alert("You can't add more than 7 levels.");
        return;
    }

    const levelsContainer = document.getElementById("levels-container");

    const levelDiv = document.createElement("div");
    levelDiv.className = "border p-3 mt-3";

    const levelTitle = document.createElement("h4");
    levelTitle.textContent = `Level ${levelCounter}`;
    levelDiv.appendChild(levelTitle);

    const fields = ["service_rates", "queue_sizes"];

    fields.forEach(field => {
        const label = document.createElement("label");
        label.textContent = `${field.replace('_', ' ')} (comma-separated):`;

        const input = document.createElement("input");
        input.type = "text";
        input.className = "form-control";
        input.name = `${field}[]`;
        input.required = true;

        levelDiv.appendChild(label);
        levelDiv.appendChild(input);
    });

    if (levelCounter === 1) {
        const spawnLabel = document.createElement("label");
        spawnLabel.textContent = "Spawn Rates (comma-separated):";

        const spawnInput = document.createElement("input");
        spawnInput.type = "text";
        spawnInput.className = "form-control";
        spawnInput.name = "spawn_rates[]";
        spawnInput.required = true;

        levelDiv.appendChild(spawnLabel);
        levelDiv.appendChild(spawnInput);
    }

    const prefabLabel = document.createElement("label");
    prefabLabel.textContent = "Server Prefab Name:";
    levelDiv.appendChild(prefabLabel);

    const prefabSelect = document.createElement("select");
    prefabSelect.className = "form-control";
    prefabSelect.name = "server_prefab_name[]";
    const prefabAValue = prefabA[levelCounter - 1];
    const prefabAOption = document.createElement("option");
    prefabAOption.value = prefabAValue;
    prefabAOption.textContent = prefabAValue;
    prefabSelect.appendChild(prefabAOption);
    levelDiv.appendChild(prefabSelect);

    const outputLabel = document.createElement("label");
    outputLabel.textContent = "Output Task Prefab Name:";
    levelDiv.appendChild(outputLabel);

    const outputSelect = document.createElement("select");
    outputSelect.className = "form-control";
    outputSelect.name = "output_task_prefab_name[]";
    const prefabBValue = prefabB[levelCounter - 1];
    const prefabBOption = document.createElement("option");
    prefabBOption.value = prefabBValue;
    prefabBOption.textContent = prefabBValue;
    outputSelect.appendChild(prefabBOption);
    levelDiv.appendChild(outputSelect);

    const rejectionLabel = document.createElement("label");
    rejectionLabel.textContent = "Rejection Allowed:";
    levelDiv.appendChild(rejectionLabel);

    const rejectionSelect = document.createElement("select");
    rejectionSelect.className = "form-control";
    rejectionSelect.name = "rejection_allowed[]";

    const trueOption = document.createElement("option");
    trueOption.value = "true";
    trueOption.textContent = "Yes";
    rejectionSelect.appendChild(trueOption);

    const falseOption = document.createElement("option");
    falseOption.value = "false";
    falseOption.textContent = "No";
    rejectionSelect.appendChild(falseOption);

    levelDiv.appendChild(rejectionSelect);

    levelsContainer.appendChild(levelDiv);
    levelCounter++;
}

function generateJSON(event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);
    const levels = [];

    for (let i = 0; i < levelCounter - 1; i++) {
        const level = {};
        const fields = ["service_rates", "queue_sizes"];

        fields.forEach(field => {
            const inputName = `${field}[]`;
            const inputValues = formData.getAll(inputName);
            console.log(inputValues[i]);
            console.log(field);
            level[field] = inputValues[i].split(',').map(value => value.trim());
        });

        if (i === 0 && formData.has("spawn_rates[]")) {
            const spawnRatesValues = formData.getAll("spawn_rates[]")[0];
            console.log(spawnRatesValues);
            level.spawn_rates = spawnRatesValues.split(',').map(value => value.trim());
        }

        level.server_prefab_name = formData.getAll("server_prefab_name[]")[i];
        level.output_task_prefab_name = formData.getAll("output_task_prefab_name[]")[i];
        level.rejection_allowed = formData.getAll("rejection_allowed[]")[i] === 'true';

        levels.push(level);
    }

    const levelList = {
        levels: levels,
        scenario: formData.get("scenario"),
        spawn_prefab: formData.get("spawn_prefab")
    };

    jsonText = JSON.stringify(levelList, null, 2); // Print the generated JSON to the console\
    console.log(jsonText);
    postJsonModel(jsonText, "user_created");
    loadUnityInstance();
}