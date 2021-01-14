# DeepL Text Translation CLI
> Unofficial CLI for translating your own text files with DeepL text services programmatically without using the developer API or the DeepL website

![alt text](https://i.ibb.co/FgFH7yY/Screenshot-2021-01-14-at-16-24-51.png "Engine parts")

## Installation and usage
- Install [node js](https://nodejs.org/en/download/)
- Install `npm i -g deepl-text-translator-cli`

## Usage
- Running `npx deepl-text-translator-cli` on a folder with create a `config.yml` file as well as `sources` and `translation` directories
- Configure `config.yml` with your DeepL credentials and set the desired translation sources and targets
- DeepL supported languages are: de-DE, en-GB, en-US, fr-FR, it-IT, ja-JA, es-ES, nl-NL, pl-PL, pt-PT, pt-BR, ru-RU, zh-ZH) - Translations must be in this 5 digit format (including case)
- Add any folders and text files to be translated in the relevant `sources` folders
- Once source text files and configurations have been set, run `npx deepl-text-translator-cli` once again to translate the files
- Translation progress will displayed on the CLI