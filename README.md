# DeepL Text Translation CLI
> Unofficial CLI for translating your own text files with DeepL text services programmatically without using the developer API or the DeepL website

![alt text](https://i.ibb.co/vhT7Rfb/deepl-text-example.gif "DeepL Text Example")

## Installation and usage
- Install [node js](https://nodejs.org/en/download/)
- Run `npm i -g deepl-text-translator-cli` to install the tool
- Run `deepl-text` from cmd line in any folder of your choice to setup
- Enter config as below and add files into generated source folders
- Run `deepl-text` to translate. Repeating this action will only translate not-already translated files

## Help
- Running `deepl-text` on a folder with create a `config.yml` file as well as `sources` and `translation` directories
- Configure `config.yml` with your DeepL credentials and set the desired translation sources and targets
- DeepL supported languages are: de-DE, en-GB, en-US, fr-FR, it-IT, ja-JA, es-ES, nl-NL, pl-PL, pt-PT, pt-BR, ru-RU, zh-ZH) - Translations must be in this 5 digit format (including case)
- Add any folders and text files to be translated in the relevant `sources` folders
- Once source text files and configurations have been set, run `deepl-text` once again to translate the files
- Translation progress will displayed on the CLI
- These actions will only affect your DeepL text translate quota (which by default is unlimited with any paid plan, including a free trial)