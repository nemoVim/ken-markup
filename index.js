class Translator {
    static boldReg = /(?<!\\)\*\*(?:((?:.|\n)+?))\*\*/g;
    static italicReg = /(?<!\\)\/\/(?:((?:.|\n)+?))\/\//g;
    static underReg = /(?<!\\)__(?:((?:.|\n)+?))__/g;
    static deleteReg = /(?<!\\)~~(?:((?:.|\n)+?))~~/g;
    static supReg = /(?<!\\)\^\^(?:((?:.|\n)+?))\^\^/g;
    static subReg = /(?<!\\),,(?:((?:.|\n)+?)),,/g;
    static indentReg = /(?<!\\)::/g;
    static hrReg = /(?<=\n)(?<!\\)(----\n)/g;
    static anchorReg = /(?<!\\)\[\[(?:(?:([^|]+?))|(?:(.+?)(?<!\\)\|(.+?)))]]/g;
    static noteReg = /(?<!\\)\(\((?:(?:([^|]+?))|(?:(.+?)(?<!\\)\|(.*?)))\)\)/g;
    static titleReg = /(?<=\n)(?<!\\)(={1,5}) (.+)(?=\n)/g;
    static paragraphReg =
        /(?<=(?:<\/h[2-6]>|<div.*?id="content".*?>))\n?((?:.|\n)*?\n?)(?=(?:<h[2-6].*?id=".+?".*?>|<\/div><hr.*?id="content-footnote".*?>))/g;

    static uListReg =
        /(?<=\n|:\(|\)\(|:{|}{)(?<!\\):\((.(?:(?<!:\().(?!:\()|\n)*?)\):(?=\n|\):|}:)/g;
    static splitUListReg = /(?<=\n)\)\((?=.)/g;
    static oListReg =
        /(?<=\n|<li.*?>|\)\(|:{|}{)(?<!\\):{(.(?:(?<!:{).(?!:{)|\n)*?)}:(?=\n|<\/li>|}:)/g;
    static splitOListReg = /(?<=.)}\n?(?=.){/g;

    static tableReg =
        /(?<=\n|<li.*?>|\)\(|}{|:\[|\]\[)(?<!\\):\[(.(?:(?<!:\[).(?!:\[)|\n)*?)\]:(?=\n|<\/li>|\]:)/g;
    static splitTrReg = /\n\]\[/g;
    static splitTdReg = /\]\[/g;
    static tdReg = /^(?:([0-9]*)\[([0-9]*)\[)?((?:.|\n)+)$/g;

    static brListReg = /(<\/ul>|<\/ol>|<\/table>)\n/g;

    // static spanReg = /./g;
    // static codeReg = /./g;
    // static quoteReg = /./g;
    // static mathReg = /./g;
    // static imageReg = /./g;
    // static highClassReg = /./g;
    // static frameReg = /./g;

    static toBold(content) {
        return content.replaceAll(this.boldReg, '<strong>$1</strong>');
    }

    static toItalic(content) {
        return content.replaceAll(this.italicReg, '<em>$1</em>');
    }

    static toUnder(content) {
        return content.replaceAll(this.underReg, '<u>$1</u>');
    }

    static toDelete(content) {
        return content.replaceAll(this.deleteReg, '<s>$1</s>');
    }

    static toSup(content) {
        return content.replaceAll(this.supReg, '<sup>$1</sup>');
    }

    static toSub(content) {
        return content.replaceAll(this.subReg, '<sub>$1</sub>');
    }

    static toIndent(content) {
        return content.replaceAll(this.indentReg, '&nbsp;&nbsp;&nbsp;&nbsp;');
    }

    static toHr(content) {
        return content.replaceAll(this.hrReg, '<hr>');
    }

    static toAnchor(content) {
        return content.replaceAll(
            this.anchorReg,
            (_match, linkName, name, link) => {
                if (linkName !== undefined) {
                    //only link
                    let parsedLinkName = this.parseAnchorLink(linkName);
                    return `<a title="${parsedLinkName}" href="${parsedLinkName}">${linkName}</a>`;
                } else {
                    // name | link
                    link = this.parseAnchorLink(link);
                    return `<a title="${link}" href="${link}">${name}</a>`;
                }
            }
        );
    }

    /**
     * Please override this method to parse the link as you want.
     * @param {string} link - original link
     * @returns {string} parsed link
     */
    static parseAnchorLink(link) {
        return link;
    }

    static toNote(content) {
        let noteList = []; // [note1, note2, ...]
        let indexList = []; // [1, 2, text, 4, 5, ...]
        let indexMap = new Map(); // { orderOfIndex1: cnt, orderOfIndex2: cnt, ...}
        let parsedContent = content.replaceAll(
            this.noteReg,
            (_match, noteAndIndex, index, note) => {
                if (noteAndIndex !== undefined) {
                    // only note
                    noteList.push(noteAndIndex);
                    indexList.push(noteList.length);
                    const idx = noteList.length;
                    return `<sup><a href="#f-${idx}" id="n-${idx}">[${idx}]</a></sup>`;
                } else {
                    // index and note
                    let indexOrder = indexList.indexOf(index) + 1; // Index of 'the index(name) of the footnote" of indexList.
                    if (indexOrder === 0) {
                        // new index
                        if (isNaN(parseInt(index))) {
                            indexList.push(index);
                            noteList.push(note);
                            indexOrder = indexList.length;
                            indexMap.set(indexOrder, 0);
                        } else {
                            throw new Error(
                                'Name of custom anchor cannot be numbers!'
                            );
                        }
                    } else {
                        // not new index
                    }
                    const indexCnt = indexMap.get(indexOrder) + 1;
                    indexMap.set(indexOrder, indexCnt);
                    return `<sup><a href="#f-${indexOrder}-${indexCnt}" id="n-${indexOrder}.${indexCnt}">[${index}]</a></sup>`;
                }
            }
        );
        parsedContent = parsedContent.concat(
            this.addFootnote(indexList, indexMap, noteList)
        );
        return parsedContent;
    }

    static addFootnote(indexList, indexMap, noteList) {
        let content = '<hr id="content-footnote"><div id="footnote">';
        for (let i = 0; i < indexList.length; i++) {
            if (typeof indexList[i] === 'number') {
                content = content.concat(
                    `<p><a id="f-${indexList[i]}" href="#n-${indexList[i]}">[${indexList[i]}]</a> ${noteList[i]}</p>`
                );
            } else {
                const footAnchor = this.makeFootAnchor(
                    i + 1,
                    indexMap.get(i + 1)
                );
                content = content.concat(
                    `<p>[${indexList[i]}]<sup>${footAnchor}</sup> ${noteList[i]}</p>`
                );
            }
        }
        content += '</div>';
        return content;
    }

    /**
     *
     * @param {number} indexOrder - The main number of order of the note
     * @param {number} indexCnt - The total count of the same indexes
     * @returns {string} HTML elements of the footnote
     */
    static makeFootAnchor(indexOrder, indexCnt) {
        let footAnchor = '';
        for (let i = 1; i <= indexCnt; i++) {
            footAnchor = footAnchor.concat(
                ` <a id="f-${indexOrder}-${i}" href="#n-${indexOrder}-${i}">${indexOrder}.${i}</a>`
            );
        }
        return footAnchor;
    }

    static toTitle(content) {
        let titleLevel = 0; // 1 ~ 5
        let titleMap = new Map(); // { titleIndex: title } | ex) {10000: 'a', 11000: 'b', ... }
        let titleIndex = 0;
        let parsedContent = content.replaceAll(
            this.titleReg,
            (_match, capture, content) => {
                if (capture.length <= titleLevel + 1 && capture.length >= 1) {
                    titleLevel = capture.length;
                    titleIndex = this.changeTitleIndex(titleIndex, titleLevel);
                    titleMap.set(titleIndex, content);
                    return this.makeTitle(titleIndex, titleLevel, content);
                } else {
                    // The most common reason might be the below.
                    // The level of title cannot be increased more than one in a step.
                    throw new Error('Wrong level of title!');
                }
            }
        );
        parsedContent = this.addTitleIndex(titleMap).concat(parsedContent);
        return parsedContent;
    }

    static changeTitleIndex(index, level) {
        const weight = 10 ** (5 - level);
        return (Math.floor(index / weight) + 1) * weight;
    }

    static makeTitle(index, level, content) {
        const idx = this.convertIndex(index);
        return `<h${level + 1} id="p-${idx.type2}"><a href="#index">${
            idx.type1
        }</a> ${content}</h${level + 1}>`;
    }

    /**
     * Return two types of index
     * @param {number} index - index number | ex) 12300
     * @returns {{type1: string, type2: string, level: number}} ex) type1: 1.2.3. | type2: 1-2-3
     */
    static convertIndex(index) {
        let level = 0;
        const indexArray = [];
        let indexOfLevel;
        while (level < 5) {
            indexOfLevel = String(index)[level];
            if (indexOfLevel !== '0') {
                indexArray.push(indexOfLevel);
            } else {
                break;
            }
            level += 1;
        }
        return {
            type1: indexArray.join('.').concat('.'),
            type2: indexArray.join('-'),
            level: level,
        };
    }

    static addTitleIndex(titleMap) {
        if (titleMap.size === 0) {
            // If there isn't any title
            return '<div id="index" style="display: none;"></div>';
        } else {
            let content = '<div id="index">';
            for (let [index, title] of titleMap) {
                const idx = this.convertIndex(index);
                content = content.concat(
                    `<p><a href="#p-${idx.type2}">${idx.type1}</a> ${title}</p>`
                );
            }
            return content.concat('</div><hr id="index-content">');
        }
    }

    static checkInsideLoop(reg, content, translateFunction) {
        let parsedContent = content;
        while (true) {
            if (parsedContent.search(reg) !== -1) {
                // There is something to change.
                // Change them from inside.
                parsedContent = parsedContent.replaceAll(
                    reg,
                    (_match, capture) => {
                        return translateFunction(capture);
                    }
                );
            } else {
                // There are no more things to change.
                break;
            }
        }
        return parsedContent;
    }

    /**
     * Connect the items in the item list.
     * @param {string} type - The type of the list | 'ul' or 'ol'
     * @param {Array} liList - The list of items
     * @returns A HTML content of the list.
     */
    static concatListItems(type, liList) {
        let listHTML = `<${type}>`;
        for (let item of liList) {
            listHTML = listHTML.concat(`<li>${item}</li>`);
        }
        listHTML = listHTML.concat(`</${type}>`);
        return listHTML;
    }

    static toUList(content) {
        return this.checkInsideLoop(this.uListReg, content, (capture) => {
            return this.concatListItems(
                'ul',
                capture.split(this.splitUListReg)
            );
        });
    }

    static toOList(content) {
        return this.checkInsideLoop(this.oListReg, content, (capture) => {
            return this.concatListItems(
                'ol',
                capture.split(this.splitOListReg)
            );
        });
    }

    static checkTableConflict(content) {
        const ulCnt = (content.match(/<ul.*?>/g) || []).length;
        const ulEndCnt = (content.match(/<\/ul>/g) || []).length;

        const olCnt = (content.match(/<ol.*?>/g) || []).length;
        const olEndCnt = (content.match(/<\/ol>/g) || []).length;

        const liCnt = (content.match(/<li.*?>/g) || []).length;
        const liEndCnt = (content.match(/<\/li>/g) || []).length;

        const liEndLiCnt = (content.match(/<\/li><li.*?>/g) || []).length;

        if (ulCnt !== ulEndCnt) return true;

        if (olCnt !== olEndCnt) return true;

        if (liCnt !== liEndCnt) return true;

        if (liEndLiCnt !== 0 && ulCnt == 0 && olCnt == 0) return true;

        return false;
    }

    static toTable(content) {
        return this.checkInsideLoop(this.tableReg, content, (capture) => {
            let trList = capture.split(this.splitTrReg);
            let tableHTML = '<table><tbody>';
            for (let tr of trList) {
                tableHTML = tableHTML.concat('<tr>');
                let tdList = tr.split(this.splitTdReg);
                for (let td of tdList) {
                    if (this.checkTableConflict(td)) {
                        // Grammar error!
                        throw new Error('Table and list grammar conflicted!');
                    } else {
                        tableHTML = tableHTML.concat(
                            td.replaceAll(
                                this.tdReg,
                                (_match, col, row, text) => {
                                    col = !col ? 1 : col;
                                    row = !row ? 1 : row;
                                    return `<td colspan="${col}" rowspan="${row}">${text}</td>`;
                                }
                            )
                        );
                    }
                }
            }
            tableHTML = tableHTML.concat('</tbody></table>');
            return tableHTML;
        });
    }

    /*
    static toSpan() {
        return new Promise((resolve) => {
            let parsedContent = content.replaceAll(
                Translator.spanReg,
                '<span style="$1">$2</span>'
            );
            content = parsedContent;
            resolve();
        });
    }

    static toCode() {
        return new Promise((resolve) => {
            let parsedContent = content.replaceAll(
                Translator.codeReg,
                '<code>$1</code>'
            );
            content = parsedContent;
            resolve();
        });
    }

    static toQuote() {
        return new Promise((resolve, reject) => {
            let parsedContent = content.replaceAll(
                Translator.quoteReg,
                (_match, level, content) => {
                    switch (level) {
                        case 1:
                            return `<blockquote class="smallBlockquote">${content}</blockquote>`;
                        case 2:
                            return `<blockquote class="">${content}</blockquote>`;
                        case 3:
                            return `<blockquote class="">${content}</blockquote>`;
                        default:
                            reject();
                            break;
                    }
                }
            );
            content = parsedContent;
            resolve();
        });
    }

    static toMath() {
        return new Promise((resolve, reject) => {
            let parsedContent = content.replaceAll(
                Translator.mathReg,
                (_match, letter, content) => {
                    if (letter === 'm') {
                        return `$|${content}|$`;
                    } else if (letter === 'M') {
                        return `$$|${content}|$$`;
                    } else {
                        reject();
                    }
                }
            );
            content = parsedContent;
            resolve();
        });
    }
    static toImage() {
        return new Promise(async (resolve, reject) => {
            let imageNameList = [];
            content.replaceAll(Translator.imageReg, (_match, imageName) => {
                imageNameList.push(Translator.getImageUrl(imageName));
                return _match;
            });
            let imageUrlList = await Promise.all(imageNameList);
            let parsedContent = content.replaceAll(
                Translator.imageReg,
                (_match, imageName, imageStyle) => {
                    return `<img class="docImg" src="${imageUrlList.shift()}" style="${imageStyle}" alt="X">`;
                }
            );
            content = parsedContent;
            resolve();
        });
    }



    // static getImageUrl(name) {
    //     return new Promise((resolve, reject) => {
    //         Translator.firebase
    //             .fstorage()
    //             .child('image/' + name)
    //             .getDownloadURL()
    //             .then((url) => resolve)
    //             .catch((error) => reject);
    //         // width 최소 20rem click시 해당 이미지 문서로 이동.
    //     });
    // }

    static toHighClass() {
        return new Promise((resolve, reject) => {
            let highClassList = [];
            let parsedContent = content.replaceAll(
                Translator.highClassReg,
                (_match, capture) => {
                    highClassList.push(capture);
                    return '';
                }
            );
            parsedContent =
                Translator.makeHighClassContent(highClassList).concat(parsedContent);
            content = parsedContent;
            resolve();
        });
    }

    static makeHighClassContent(highClassList) {
        let content = '<div>분류:&nbsp;';
        for (let highClass of highClassList) {
            content = content.concat(
                `<a href="w/분류:${highClass} title="분류:${highClass}>${highClass}</a>`
            );
        }
        content = content.concat('</div><hr>');
        return content;
    }

    static toFrame() {
        return new Promise((resolve, reject) => {
            // TODO: to frame.
        });
    }

    */

    /** To clear HTML content by removing unnecessary white spaces. */
    static toClear(content) {
        content = content.replaceAll(this.brListReg, '$1');
        return content;
    }

    /** Remove \\ before the grammars at the last */
    static toNormal(content) {
        const boldReg = /\\(\*\*(?:.|\n)+?\*\*)/g;
        const italicReg = /\\(\/\/(?:.|\n)+?\/\/)/g;
        const underReg = /\\(__(?:.|\n)+?__)/g;
        const deleteReg = /\\(~~(?:.|\n)+?~~)/g;
        const supReg = /\\(\^\^(?:.|\n)+?\^\^)/g;
        const subReg = /\\(,,(?:.|\n)+?,,)/g;
        const indentReg = /\\(::)/g;
        const hrReg = /(?<=\n)\\(----)(?=\n)/g;
        const anchorReg = /\\(\[\[(?:[^|]+?|.+?(?<!\\)\|.+?)]])/g;
        const noteReg = /\\(\(\((?:[^|]+?|.+?(?<!\\)\|.*?)\)\))/g;
        const titleReg = /(?<=\n)\\(={2,6} .+)(?=\n)/g;
        const uListReg =
            /(?<=\n|:\(|\)\(|:{|}{)\\(:\(.(?:(?<!:\().(?!:\()|\n)*?\):)(?=\n|\):|}:)/g;
        const oListReg =
            /(?<=\n|<li.*?>|\)\(|:{|}{)\\(:{.(?:(?<!:{).(?!:{)|\n)*?}:)(?=\n|<\/li>|}:)/g;
        const tableReg =
            /(?<=\n|<li.*?>|\)\(|}{|:\[|\]\[)\\(:\[.(?:(?<!:\[).(?!:\[)|\n)*?\]:)(?=\n|<\/li>|\]:)/g;

        content = content.replaceAll(boldReg, '$1');
        content = content.replaceAll(italicReg, '$1');
        content = content.replaceAll(underReg, '$1');
        content = content.replaceAll(deleteReg, '$1');
        content = content.replaceAll(supReg, '$1');
        content = content.replaceAll(subReg, '$1');
        content = content.replaceAll(indentReg, '$1');
        content = content.replaceAll(hrReg, '$1');
        content = content.replaceAll(anchorReg, '$1');
        content = content.replaceAll(noteReg, '$1');
        content = content.replaceAll(titleReg, '$1');
        content = content.replaceAll(uListReg, '$1');
        content = content.replaceAll(oListReg, '$1');
        content = content.replaceAll(tableReg, '$1');

        return content;
    }

    /** Make paragraphs between all h elements. */
    static toParagraph(content) {
        content = content.replaceAll(this.paragraphReg, '<div>$1</div>');

        return content;
    }

    static translate(content) {
        const result = {
            content: '',
            highClassList: [],
            keywordList: [],
            status: true,
            error: '',
        };

        try {
            content = '<div id="content">\n' + content + '\n</div>';

            content = this.toBold(content);
            content = this.toItalic(content);
            content = this.toDelete(content);
            content = this.toUnder(content);
            content = this.toSup(content);
            content = this.toSub(content);
            content = this.toIndent(content);
            content = this.toHr(content);
            content = this.toAnchor(content);
            content = this.toNote(content);
            content = this.toTitle(content);
            content = this.toUList(content); // It should be done before oList.
            content = this.toOList(content); // It should be done after uList.
            content = this.toTable(content); // It should be done after above two types lists.

            // content = this.toSpan(content);
            // content = this.toImage(content);
            // content = this.toQuote(content);
            // content = this.toFrame(content);
            // content = this.toHighClass(content);
            // content = this.toMath(content);
            // content = this.toCode(content);

            content = this.toClear(content); // This should be done after from lists and table.
            content = this.toNormal(content); // This should be the second from the last
            content = this.toParagraph(content); // This should be the last

            // content = content.replace(/(?<=\n?)((?:.|\n)*)(?=\n?)/, '$1');

            content = content.replaceAll(/\n/g, '<br>');

            result.content = content;
            result.status = true;

            return result;
        } catch (e) {
            result.status = false;
            result.error = e;
            return result;
        }
    }
}

export default Translator;
