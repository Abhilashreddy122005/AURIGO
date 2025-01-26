let chatBox = document.getElementById('chat-box');

// Load prompts from prompts.json
let prompts = [];

fetch('/static/prompts.json')
    .then(response => response.json())
    .then(data => {
        prompts = data.prompts;
    })
    .catch(error => console.error('Error loading prompts:', error));

let area = 0, floors = 0, rooms = 0, bathrooms = 0, constructionType = '';
let flooringType = '', foundationType = '';
let initialBidAmount = 0;
let adjustments = [];

// Function to send user message
function sendMessage() {
    const userInput = document.getElementById('user-input').value;
    if (userInput.trim() === "") return;

    // Display user message
    chatBox.innerHTML += `<div class="user-message">${userInput}</div>`;
    document.getElementById('user-input').value = '';

    // Process the message
    processMessage(userInput);
}

// Function to process user input
function processMessage(message) {
    let response = '';

    // Initialize variables for construction details
    const previousArea = area;
    const previousBathrooms = bathrooms;
    const previousConstructionType = constructionType;

    // Analyze the user input for construction details
    const areaMatch = message.match(/(\d+)\s*(sq\.?m|square meters|sq mt)/i);
    const floorsMatch = message.match(/(\d+)\s*floors?/);
    const roomsMatch = message.match(/(\d+)\s*rooms?/);
    const bathroomsMatch = message.match(/(\d+)\s*bathrooms?/);
    const typeMatch = message.match(/(residential|commercial|industrial)/i);
    const flooringMatch = message.match(/(wood|tile|carpet)/i);
    const foundationTypeMatch = message.match(/(slab|crawl space|basement)/i);

    area = areaMatch ? parseInt(areaMatch[1]) : area;
    floors = floorsMatch ? parseInt(floorsMatch[1]) : floors;
    rooms = roomsMatch ? parseInt(roomsMatch[1]) : rooms;
    bathrooms = bathroomsMatch ? parseInt(bathroomsMatch[1]) : bathrooms;
    constructionType = typeMatch ? typeMatch[1].toLowerCase() : constructionType;
    flooringType = flooringMatch ? flooringMatch[0] : flooringType;
    foundationType = foundationTypeMatch ? foundationTypeMatch[0] : foundationType;

    // Calculate initial bid amount
    const { bidAmount, costBreakdown, estimatedTime } = calculateBid(area, floors, rooms, bathrooms, constructionType);
    initialBidAmount = bidAmount; // Store the initial bid amount
    response = `The estimated bid amount for your project is $${bidAmount}.\n\nEstimated time to build: ${estimatedTime} days.\n\nDetailed Cost Breakdown:\n${costBreakdown}`;

    // Display initial bot response
    chatBox.innerHTML += `<div class="bot-response">${response.replace(/\n/g, '<br>')}</div>`;
    chatBox.scrollTop = chatBox.scrollHeight; // Scroll to the bottom

    // Allow for what-if analysis
    chatBox.innerHTML += `<div class="bot-response">You can ask "what-if" questions to adjust the bid further.</div>`;

    // Check for prompt matches for what-if analysis
    prompts.forEach(prompt => {
        if (message.toLowerCase().includes(prompt.prompt.toLowerCase())) {
            // Adjust the bid based on the prompt effect
            if (prompt.effect.area) {
                area += prompt.effect.area; // Add to existing area
                adjustments.push(`Area adjusted to ${area} sq.m`);
            }
            if (prompt.effect.constructionType) {
                constructionType = prompt.effect.constructionType; // Change construction type
                adjustments.push(`Construction type changed to ${constructionType}`);
            }
            if (prompt.effect.bathrooms) {
                bathrooms += prompt.effect.bathrooms; // Add to existing bathrooms
                adjustments.push(`Bathrooms increased to ${bathrooms}`);
            }
            if (prompt.effect.flooringType) {
                flooringType = prompt.effect.flooringType; // Change flooring type
                adjustments.push(`Flooring type changed to ${flooringType}`);
            }
            if (prompt.effect.foundationType) {
                foundationType = prompt.effect.foundationType; // Change foundation type
                adjustments.push(`Foundation type changed to ${foundationType}`);
            }
            if (prompt.effect.additionalCost) {
                initialBidAmount += prompt.effect.additionalCost; // Add additional cost
                adjustments.push(`Additional cost of $${prompt.effect.additionalCost} added`);
            }
            response = `The bid has been adjusted based on your request: ${prompt.prompt}`;
        }
    });

    // Recalculate the bid after adjustments
    if (adjustments.length > 0) {
        const { bidAmount, costBreakdown, estimatedTime } = calculateBid(area, floors, rooms, bathrooms, constructionType);
        initialBidAmount = bidAmount; // Update the bid amount after adjustments
        response += `\n\nThe updated estimated bid amount is now $${bidAmount}.\n\nEstimated time to build: ${estimatedTime} days.\n\nDetailed Cost Breakdown:\n${costBreakdown}`;
    }

    // Display all relevant construction details
    response += `\n\nCurrent Construction Details:\n- Area: ${area} sq.m\n- Floors: ${floors}\n- Rooms: ${rooms}\n- Bathrooms: ${bathrooms}\n- Construction Type: ${constructionType}\n- Flooring Type: ${flooringType}\n- Foundation Type: ${foundationType}`;

    // Display adjustments made
    if (adjustments.length > 0) {
        chatBox.innerHTML += `<div class="bot-response">Adjustments made: ${adjustments.join(', ')}</div>`;
        adjustments = []; // Clear adjustments for the next message
    }
}

// Function to calculate the bid
function calculateBid(area, floors, rooms, bathrooms, constructionType) {
    const baseRate = 100; // Example base rate per square meter
    let multiplier = 1;

    if (constructionType === 'residential') {
        multiplier = 1.2;
    } else if (constructionType === 'commercial') {
        multiplier = 1.5;
    } else if (constructionType === 'industrial') {
        multiplier = 1.8;
    }

    const laborCost = 50 * rooms; // Example: $50 per room for labor
    const concreteCost = area > 0 ? area * 30 : 0; // Example: $30 per sq.m for concrete
    const wireCost = area > 0 ? area * 10 : 0; // Example: $10 per sq.m for wires
    const brickCost = rooms > 0 ? rooms * 100 : 0; // Example: $100 per room for bricks

    const totalMaterialCost = concreteCost + wireCost + brickCost;
    const totalCost = area * baseRate * multiplier + laborCost + totalMaterialCost;

    const costBreakdown = `
    Labor Cost: $${laborCost}
    Concrete Cost: $${concreteCost}
    Wire Cost: $${wireCost}
    Brick Cost: $${brickCost}
    Total Material Cost: $${totalMaterialCost}
    `;

    // Estimate time to build based on area and floors
    const estimatedTime = Math.ceil((area / 50) + (floors * 10)); // Example: 50 sq.m per day + 10 days per floor

    return { bidAmount: totalCost, costBreakdown, estimatedTime };
}
