const fs = require("fs");
const path = require("path");

const config = require("./config.js");

const indexPath = path.join(config.htmlPath, "index.json");
const template = fs.readFileSync("./template.html", "utf-8");

const index = {
	assets: [],
	pages: []
};

/**
 * @param {String} text 
 * @param {String} separator 
 * @returns String
 */
const extractPart = (text, separator) => text.includes(separator) ? text.slice(text.indexOf(separator) + separator.length, text.lastIndexOf(separator)).trim() : "";

const compileSources = (url) => {
	if (url.startsWith("assets://")) {

	}

	return `<img src="${url}" />`;
};

const compileURL = (url) => {
	if (url.startsWith("assets://")) return url.replace("assets://", "/wiki/assets/");
	if (url.startsWith("wiki://")) return url.replace("wiki://", "/wiki/pages/");

	return url;
};

const URLStatus = (url) => {
	if (url.startsWith("assets://")) {
		const assetName = url.slice(7);
		for (const asset of index.assets) {
			if (asset.path == assetName) return true;
		}
	}

	if (url.startsWith("wiki://")) {
		const pageName = url.slice(7);
		for (const page of index.pages) {
			if (page.path == pageName) return true;
		}
	}

	return false;
};

const compileMarkdown = (markdown) => {
	let html = markdown;
	const replacements = [
		[/^(#{1,3})\s(.+)$/gm, (_, hashes, content) => `<h${hashes.length}>${content}</h${hashes.length}>`], // Titles
		[/(\*\*\*|___)(.+?)\1/g, "<b><i>$2</i></b>"], // Bold and italic
		[/(\*\*|__)(.+?)\1/g, "<b>$2</b>"], // Bold
		[/(\*|_)(.+?)\1/g, "<i>$2</i>"], // Italic
		[/\!\[([^\]]+)\]\(([^)]+)\)/g, (_, alt, url) => `<figure>${compileSources(url)}<figcaption>${alt}</figcaption></figure>`], // Images
		[/\[([^\]]+)\]\(([^)]+)\)/g, (_, content, url) => `<a valid="${URLStatus(url)}" href="${compileURL(url)}">${content}</a>`], // Links
		[/^(?:---|\*\*\*|___)\s*$/gm, "<hr />"], // Separator
		[/((?:^[\*\-\+]\s+.+\n?)+)/gm, (match) => `<ul>${match.trim().split("\n").map((line) => line.replace(/^[\*\-\+]\s+/, "<li>") + "</li>").join("")}</ul>`], // Lists
	];
	for (const replacement of replacements) html = html.replace(replacement[0], replacement[1]);
	return html;
};

const compileInfobox = (infobox) => {
	if (Object.keys(infobox).length > 0) {

	}

	return "";
};

const cleanAssets = async () => {
	const index = fs.existsSync(indexPath) ? JSON.parse(fs.readFileSync(indexPath, "utf-8")) : { assets: [], pages: [] };

	for (const asset of index.assets) fs.rmSync(path.join(config.htmlPath, "assets", asset.path), { recursive: true });

	console.log(`Deleted ${index.assets.length} assets.`);
};

const cleanWiki = async () => {
	const index = fs.existsSync(indexPath) ? JSON.parse(fs.readFileSync(indexPath, "utf-8")) : { assets: [], pages: [] };

	for (const page of index.pages) fs.rmSync(path.join(config.htmlPath, page.path), { recursive: true });

	console.log(`Deleted ${index.pages.length} pages.`);
};

const buildIndex = async () => {
	const forbiddenFiles = [".DS_Store"];

	for (const file of fs.readdirSync(path.join(config.wikiPath, "wiki"))) {
		if (!forbiddenFiles.includes(file)) {
			console.log(file);
			const filePath = path.join(config.wikiPath, "wiki", file);
			const fileName = file.slice(0, -3);
			const markdown = fs.readFileSync(filePath, "utf-8");

			const metadata = JSON.parse(extractPart(markdown, config.separators.metadata));

			if (metadata.active) {
				index.pages.push({
					title: metadata.title,
					summary: metadata.summary,
					path: fileName
				});
			} else console.log(`Page "${fileName}" disabled.`);
		}
	}

	for (const folder of fs.readdirSync(path.join(config.wikiPath, "assets"))) {
		if (!forbiddenFiles.includes(folder)) {
			const folderPath = path.join(config.wikiPath, "assets", folder);
			const info = fs.readFileSync(path.join(folderPath, "info.json"), "utf-8");
			console.log(info);

			index.assets.push({
				path: folder
			});
		}
	}

	fs.writeFileSync(indexPath, JSON.stringify(index));

	console.log(`Indexed ${index.assets.length} assets and ${index.pages.length} pages.`);
};

const buildAssets = async () => {
	for (const asset of index.assets) {
		const folderPath = path.join(config.wikiPath, "wiki", "assets", asset.path);
		fs.mkdirSync(folderPath, { recursive: true });
		console.log(`Built asset ${asset.path}.`);
	}
};

const buildWiki = async () => {
	for (const page of index.pages) {
		const filePath = path.join(config.wikiPath, "wiki", `${page.path}.md`);
		const markdown = fs.readFileSync(filePath, "utf-8");
		const infobox = extractPart(markdown, config.separators.infobox);
		const parsedInfobox = JSON.parse(infobox.length > 0 ? infobox : "{}");
		const content = extractPart(markdown, config.separators.content);

		const htmlFolder = path.join(config.htmlPath, page.path);
		fs.mkdirSync(htmlFolder, { recursive: true });

		const html = compileMarkdown(template
			.split("{{CONTENT}}").join(compileInfobox(parsedInfobox) + `<page><h1>{{TITLE}}</h1>${content}</page>`)
			.split("{{TITLE}}").join(page.title)
			.split("{{SUMMARY}}").join(page.summary)
			.split("{{FILENAME}}").join(page.path));
		fs.writeFileSync(path.join(htmlFolder, "index.html"), html, "utf-8");

		console.log(`Built page ${page.path}.`);
	}
};

(async () => {
	console.log("Cleaning assets...");
	await cleanAssets();
	console.log("Assets cleaned.");
	console.log("Cleaning wiki...");
	await cleanWiki();
	console.log("Wiki cleaned.");

	if (process.env.CLEAN != "true") {
		console.log("Building index...");
		await buildIndex();
		console.log("Index built.");

		console.log("Building assets...");
		await buildAssets();
		console.log("Assets built.");

		console.log("Building wiki...");
		await buildWiki();
		console.log("Wiki built.");
	}
})();