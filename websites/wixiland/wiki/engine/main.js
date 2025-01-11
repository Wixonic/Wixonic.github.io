const fs = require("fs");
const path = require("path");

const config = require("./config.js");

const markdownPath = config.markdownWikiPath;
const indexPath = path.join(config.htmlWikiPath, "index.json");

const template = fs.readFileSync("./template.html", "utf8");

const cleanWiki = async () => {
	const index = fs.existsSync(indexPath) ? JSON.parse(fs.readFileSync(indexPath, "utf8")) : { pages: [], count: 0 };

	for (const page of index.pages) fs.rmSync(path.join(config.htmlWikiPath, page.file), { recursive: true });

	console.log(`Deleted ${index.count} pages.`);
};

const buildIndex = async () => {
	const index = {
		pages: [],
		count: 0
	};

	for (const file of fs.readdirSync(markdownPath, { recursive: true })) {
		const filePath = path.join(markdownPath, file);
		const fileName = file.slice(0, -3);
		const markdown = fs.readFileSync(filePath, "utf8").split("<!--METADATA-->\n<!--CONTENT-->");

		const metadata = JSON.parse(markdown[0].trim());

		index.pages.push({
			title: metadata.title,
			summary: metadata.summary,
			file: fileName
		});
		index.count++;
	}

	fs.writeFileSync(indexPath, JSON.stringify(index));

	console.log(`Indexed ${index.count} pages.`);
};

const buildWiki = async () => {
	for (const file of fs.readdirSync(markdownPath, { recursive: true })) {
		const filePath = path.join(markdownPath, file);
		const fileName = file.slice(0, -3);
		const markdown = fs.readFileSync(filePath, "utf8").split("<!--METADATA-->\n<!--CONTENT-->");

		const metadata = JSON.parse(markdown[0].trim());
		const content = markdown[1].trim();

		let html = template.split("{{CONTENT}}").join(content).split("{{FILENAME}}").join(fileName);

		for (const key in metadata) {
			html = html.split(`{{${key.toUpperCase()}}}`).join(metadata[key]);
		}

		const htmlFolder = path.join(config.htmlWikiPath, fileName);

		fs.mkdirSync(htmlFolder, { recursive: true });
		fs.writeFileSync(path.join(htmlFolder, "index.html"), html, "utf8");

		console.log(`Built file ${fileName}.`);
	}
};

(async () => {
	console.log("Cleaning wiki...");
	await cleanWiki();
	console.log("Wiki cleaned.");

	if (process.env.CLEAN != "true") {
		console.log("Building index...");
		await buildIndex();
		console.log("Index built.");

		console.log("Building wiki...");
		await buildWiki();
		console.log("Wiki built.");
	}
})();