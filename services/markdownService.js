const fs = require("fs");
const path = require("path");

const cleanValue = (value) => String(value || "").trim();

const splitListValue = (value) => {
  if (!value) return [];
  return String(value)
    .split(/,|\|/)
    .map((entry) => entry.trim())
    .filter(Boolean);
};

const parseMarkdown = (markdown = "") => {
  const result = {
    title: "",
    itinerary: [],
  };

  const raw = String(markdown || "").trim();
  if (!raw) return result;

  const titleMatch = raw.match(/^#\s+(.+)$/m);
  if (titleMatch) {
    result.title = cleanValue(titleMatch[1]);
  }

  const dayMatches = [...raw.matchAll(/^#{2,3}\s*Day\s*(\d+)\s*\n([\s\S]*?)(?=^#{2,3}\s*Day\s*\d+\s*$|$)/gim)];

  result.itinerary = dayMatches.map((match, index) => {
    const dayNumber = Number(match[1]) || index + 1;
    const dayBlock = match[2] || "";
    const lines = dayBlock
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const day = {
      day: dayNumber,
      hotel: "",
      transfer: "",
      sightseeing: [],
      meals: [],
      activities: [],
      info: "",
    };

    let pendingListType = "";
    lines.forEach((line) => {
      const bullet = line.replace(/^[-*]\s*/, "");
      const lower = bullet.toLowerCase();

      if (lower.startsWith("hotel:")) {
        day.hotel = cleanValue(bullet.split(":").slice(1).join(":"));
        return;
      }

      if (lower.startsWith("transfer:")) {
        day.transfer = cleanValue(bullet.split(":").slice(1).join(":"));
        return;
      }

      if (lower.startsWith("sightseeing:")) {
        const value = cleanValue(bullet.split(":").slice(1).join(":"));
        if (value) day.sightseeing.push(...splitListValue(value));
        pendingListType = value ? "" : "sightseeing";
        return;
      }

      if (lower.startsWith("meal:") || lower.startsWith("meals:")) {
        const value = cleanValue(bullet.split(":").slice(1).join(":"));
        if (value) day.meals.push(...splitListValue(value));
        pendingListType = value ? "" : "meals";
        return;
      }

      if (lower.startsWith("activity:") || lower.startsWith("activities:")) {
        const value = cleanValue(bullet.split(":").slice(1).join(":"));
        if (value) day.activities.push(...splitListValue(value));
        pendingListType = value ? "" : "activities";
        return;
      }

      if (lower.startsWith("info:") || lower.startsWith("information:")) {
        const nextInfo = cleanValue(bullet.split(":").slice(1).join(":"));
        day.info = day.info ? `${day.info} ${nextInfo}` : nextInfo;
        return;
      }

      if (line.startsWith("-") || line.startsWith("*")) {
        const cleaned = cleanValue(bullet);
        if (pendingListType === "sightseeing") day.sightseeing.push(cleaned);
        else if (pendingListType === "meals") day.meals.push(cleaned);
        else if (pendingListType === "activities") day.activities.push(cleaned);
        else day.activities.push(cleaned);
      } else if (!line.startsWith("#")) {
        day.info = day.info ? `${day.info} ${cleanValue(line)}` : cleanValue(line);
        pendingListType = "";
      }
    });

    day.sightseeing = [...new Set(day.sightseeing)];
    day.meals = [...new Set(day.meals)];
    day.activities = [...new Set(day.activities)];
    day.info = cleanValue(day.info);

    return day;
  });

  return result;
};

const generatePrompt = (masterData = [], title, state, city, days) => {
  const byCategory = (category) =>
    masterData
      .filter((item) => (item.category || item.type) === category)
      .map((item) => cleanValue(item.name))
      .filter(Boolean)
      .join(", ");

  const hotels = byCategory("hotel") || "Use best available options";
  const transfers = byCategory("transfer") || "Use best available options";
  const sightseeing = byCategory("sightseeing") || "Use best available options";
  const meals = byCategory("meal") || "Use best available options";

  return [
    `Create a ${days}-day travel itinerary in markdown format.`,
    `Title: ${title}`,
    `Destination: ${city}, ${state}`,
    "",
    "Available options (prioritize these names when possible):",
    `Hotels: ${hotels}`,
    `Transfers: ${transfers}`,
    `Sightseeing: ${sightseeing}`,
    `Meals: ${meals}`,
    "",
    "Output format:",
    "# <Package Title>",
    "",
    "## Day 1",
    "- Hotel: <name>",
    "- Transfer: <name>",
    "- Sightseeing: <one or more entries>",
    "- Meals: <one or more entries>",
    "- Activities: <one or more entries>",
    "- Info: <brief day summary>",
    "",
    `Repeat the same structure for all ${days} days.`,
  ].join("\n");
};

const generateMarkdown = (packageData = {}) => {
  const safeTitle = cleanValue(packageData.title) || "Untitled Package";
  const safeState = cleanValue(packageData.state);
  const safeCity = cleanValue(packageData.city);
  const days = Number(packageData?.duration?.days) || 0;
  const nights = Number(packageData?.duration?.nights) || Math.max(0, days - 1);
  const itinerary = Array.isArray(packageData.itinerary) ? packageData.itinerary : [];

  let markdown = `# ${safeTitle}\n\n`;
  markdown += "## Destination\n";
  markdown += `- State: ${safeState}\n`;
  markdown += `- City: ${safeCity}\n`;
  markdown += `- Duration: ${days} Days / ${nights} Nights\n\n`;
  markdown += "## Itinerary\n\n";

  itinerary.forEach((day, index) => {
    const dayNo = Number(day?.day) || index + 1;
    markdown += `### Day ${dayNo}\n`;

    if (cleanValue(day?.hotel)) markdown += `- Hotel: ${cleanValue(day.hotel)}\n`;
    if (cleanValue(day?.transfer)) markdown += `- Transfer: ${cleanValue(day.transfer)}\n`;

    const sightseeing = Array.isArray(day?.sightseeing) ? day.sightseeing.filter(Boolean) : [];
    if (sightseeing.length) {
      markdown += "- Sightseeing:\n";
      sightseeing.forEach((item) => {
        markdown += `  - ${cleanValue(item)}\n`;
      });
    }

    const meals = Array.isArray(day?.meals) ? day.meals.filter(Boolean) : [];
    if (meals.length) {
      markdown += "- Meals:\n";
      meals.forEach((item) => {
        markdown += `  - ${cleanValue(item)}\n`;
      });
    }

    const activities = Array.isArray(day?.activities) ? day.activities.filter(Boolean) : [];
    if (activities.length) {
      markdown += "- Activities:\n";
      activities.forEach((item) => {
        markdown += `  - ${cleanValue(item)}\n`;
      });
    }

    if (cleanValue(day?.info)) {
      markdown += `- Info: ${cleanValue(day.info)}\n`;
    }

    markdown += "\n";
  });

  return markdown;
};

const saveMarkdownFile = (packageData = {}) => {
  const markdown = generateMarkdown(packageData);
  const folderPath = path.join(__dirname, "..", "public", "markdown");

  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }

  const safeTitle = (cleanValue(packageData.title) || "itinerary")
    .replace(/[^a-zA-Z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();

  const fileName = `${Date.now()}-${safeTitle || "itinerary"}.md`;
  const filePath = path.join(folderPath, fileName);

  fs.writeFileSync(filePath, markdown, "utf-8");

  return {
    fileName,
    filePath,
    publicPath: `/public/markdown/${fileName}`,
    markdown,
  };
};

module.exports = {
  parseMarkdown,
  generatePrompt,
  generateMarkdown,
  saveMarkdownFile,
};
