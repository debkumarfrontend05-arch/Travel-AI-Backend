/**
 * Markdown Parser Service
 * Extracts structured data from itinerary markdown
 */

exports.parseMarkdown = (markdown) => {
  const result = {
    title: "",
    itinerary: []
  };

  // Extract Title (# title)
  const titleMatch = markdown.match(/^#\s+(.*)$/m);
  if (titleMatch) {
    result.title = titleMatch[1].trim();
  }

  // Split by Days (## Day X)
  const daySections = markdown.split(/^##\s+Day\s+(\d+)/im);
  // daySections will be something like ["# Title\n", "1", "content of day 1", "2", "content of day 2"]
  
  for (let i = 1; i < daySections.length; i += 2) {
    const dayNumber = parseInt(daySections[i]);
    const dayContent = daySections[i + 1] || "";
    
    const dayObj = {
      day: dayNumber,
      hotel: "",
      transfer: "",
      sightseeing: [],
      meals: [],
      activities: [],
      info: ""
    };

    // Parse bullet points
    const lines = dayContent.split("\n");
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith("-") || trimmed.startsWith("*")) {
        const content = trimmed.replace(/^[-*]\s*/, "").trim();
        
        // Simple keyword-based extraction (can be improved)
        if (content.toLowerCase().includes("hotel:")) {
          dayObj.hotel = content.split(":")[1].trim();
        } else if (content.toLowerCase().includes("transfer:")) {
          dayObj.transfer = content.split(":")[1].trim();
        } else if (content.toLowerCase().includes("meal:")) {
          dayObj.meals.push(content.split(":")[1].trim());
        } else if (content.toLowerCase().includes("sightseeing:")) {
          dayObj.sightseeing.push(content.split(":")[1].trim());
        } else if (content.toLowerCase().includes("activity:")) {
          dayObj.activities.push(content.split(":")[1].trim());
        } else {
          dayObj.activities.push(content);
        }
      } else if (trimmed && !trimmed.startsWith("#")) {
        dayObj.info += trimmed + " ";
      }
    });

    dayObj.info = dayObj.info.trim();
    result.itinerary.push(dayObj);
  }

  return result;
};

/**
 * Generate Structured Prompt for external use
 */
exports.generatePrompt = (masterData, title, state, city, days) => {
  const hotels = masterData.filter(d => d.category === "hotel").map(d => d.name).join(", ");
  const transfers = masterData.filter(d => d.category === "transfer").map(d => d.name).join(", ");
  const sightseeing = masterData.filter(d => d.category === "sightseeing").map(d => d.name).join(", ");
  const meals = masterData.filter(d => d.category === "meal").map(d => d.name).join(", ");

  return `
Create a travel package markdown for:
Title: ${title}
Location: ${city}, ${state}
Duration: ${days} Days

Available Options (MUST USE THESE NAMES if possible):
Hotels: ${hotels}
Transfers: ${transfers}
Sightseeing: ${sightseeing}
Meals: ${meals}

FORMAT REQUIREMENT:
# Package Title

## Day 1
- Hotel: [choose from list]
- Transfer: [choose from list]
- Sightseeing: [choose from list]
- Meal: [choose from list]
- Activity: [any additional activity]
Brief description of the day.

## Day 2
... (repeat for ${days} days)
`;
};