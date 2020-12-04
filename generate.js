const path = require("path");
const { pascalCase } = require("pascal-case");
const fs = require("fs-extra");
const pkg = require("./package.json");

// const handleComponentName = (name) => name.replace(/\-(\d+)/, "$1");

const componentTemplate = (name, svg) =>
  `<template>
${svg.trim().replace(/^/mg, '  ')}
</template>
`.trim();

const nuxtIndexJSTemplate = (category) =>
  `import { join } from "path";

export default function () {
  const { nuxt } = this

  if (!nuxt.options.components) {
    throw new Error('please set \`components: true\` inside \`nuxt.config\` and ensure using \`nuxt >= 2.13.0\`')
  }

  this.nuxt.hook("components:dirs", (dirs) => {
    dirs.push({
      path: join(__dirname, "../src/components"),
      prefix: "${category}",
    });
  });
}
`.trim()

const packageJSONTemplate = (category) =>
  `{
  "name": "@nuxt-hero-icons/${category}",
  "version": "${pkg.version}",
  "license": "${pkg.license}",
  "homepage": "${pkg.homepage}",
  "description": "${pkg.description}",
  "keywords": ${JSON.stringify(pkg.keywords)},
  "repository": ${JSON.stringify(pkg.repository)},
  "author": "${pkg.author}",
  "files": [
    "src",
    "nuxt"
  ],
  "dependencies": {
    "heroicons": "${pkg.dependencies.heroicons}"
  }
}
`.trim();

async function main() {
  await fs.remove("./packages");
  const iconDirsPath = path.join(__dirname, "node_modules/heroicons/optimized");
  const categories = ["outline", "solid"];
  const icons = [];

  const categoryByOriginCategory = {
    outline: "outline",
    solid: "solid",
  };

  for (const originCategory of categories) {
    const categoryPath = path.join(iconDirsPath, originCategory);
    const filenames = await fs.readdir(categoryPath);

    const iconsByCategory = filenames.map((filename) => {
      const name = filename.split(".")[0];
      return {
        path: path.join(categoryPath, filename),
        name,
        category: categoryByOriginCategory[originCategory],
        componentName: pascalCase(`${name}Icon`).replace("_", ""),
      };
    });

    icons.push(...iconsByCategory);
  }
  for (const icon of icons) {
    // Create Vue component files
    const svg = await fs.readFile(icon.path, "utf8");
    const component = componentTemplate(icon.componentName, svg);
    const filepath = `./packages/${icon.category}/src/components/${icon.componentName}.vue`;
    await fs.ensureDir(path.dirname(filepath));
    await fs.writeFile(filepath, component, "utf8");

    const indexJSContent = `export { default as ${icon.componentName} } from './icons/${icon.componentName}'`.concat(
      "\n\n"
    );
  }

  for (const category of Object.values(categoryByOriginCategory)) {
    const packagePath = path.join('.', 'packages', category);
    const nuxtIndexJSPath = path.join(__dirname, packagePath, "nuxt", "index.js");

    await fs.ensureDir(path.dirname(nuxtIndexJSPath));
    await fs.writeFile(nuxtIndexJSPath, nuxtIndexJSTemplate(category), "utf8");

    await fs.writeFile(
      path.join(__dirname, `./packages/${category}/package.json`),
      packageJSONTemplate(category),
      "utf8"
    );

    await fs.copyFile(
      "./README.md",
      path.join(__dirname, `./packages/${category}/README.md`)
    );
  }
}

main().catch((err) => {
  console.error(err);
});

