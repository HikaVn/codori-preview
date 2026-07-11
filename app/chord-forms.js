// コードの展開形（同じコードの別の押さえ方）を計算して、運指図SVGをつくる共有スクリプト。
// 図鑑（main.js）とうた練習（song/song.js）の両方から <script> で読み込み、
// window.CodoriChordForms として使う。
(function () {
  // High-G チューニング（G4 C4 E4 A4）
  const OPEN_STRING_MIDIS = [67, 60, 64, 69];
  const STRING_LABELS = ["G", "C", "E", "A"];
  const MAX_FRET = 10; // 探索する最高フレット（これより上は実用的に押さえにくい）
  const MAX_SPAN = 3; // 押さえるフレットの幅（min〜max）の上限
  const MAX_FORMS = 4; // 基本形＋展開形で最大4つまで
  const HIGHER_POSITION_STEP = 3; // 「さらに上の形」と見なすポジション差

  const ROOT_SEMITONES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const QUALITY_INTERVALS = {
    "": [0, 4, 7],
    maj7: [0, 4, 7, 11],
    M7: [0, 4, 7, 11],
    maj9: [0, 4, 7, 11, 14],
    "6": [0, 4, 7, 9],
    "7": [0, 4, 7, 10],
    "9": [0, 4, 7, 10, 14],
    add9: [0, 4, 7, 14],
    sus4: [0, 5, 7],
    sus2: [0, 2, 7],
    "7sus4": [0, 5, 7, 10],
    sus47: [0, 5, 7, 10],
    m: [0, 3, 7],
    m6: [0, 3, 7, 9],
    m7: [0, 3, 7, 10],
    m9: [0, 3, 7, 10, 14],
    mM7: [0, 3, 7, 11],
    mmaj7: [0, 3, 7, 11],
    "m7-5": [0, 3, 6, 10],
    m7b5: [0, 3, 6, 10],
    // ウクレレの運指図の慣習（既存アセットも同じ）に合わせて、dimはdim7の形で探す
    dim: [0, 3, 6, 9],
    dim7: [0, 3, 6, 9],
    aug: [0, 4, 8],
    aug7: [0, 4, 8, 10],
    "7-5": [0, 4, 6, 10]
  };

  function parseChordName(chord) {
    const main = String(chord || "").split("/")[0].trim();
    const match = main.match(/^([A-G])(#|b)?(.*)$/);
    if (!match) {
      return null;
    }
    let semitone = ROOT_SEMITONES[match[1]];
    if (match[2] === "#") {
      semitone += 1;
    } else if (match[2] === "b") {
      semitone -= 1;
    }
    return { semitone: (semitone + 12) % 12, suffix: match[3] || "" };
  }

  function intervalsForSuffix(suffix) {
    if (suffix in QUALITY_INTERVALS) {
      return QUALITY_INTERVALS[suffix];
    }
    // 未知のサフィックスはざっくり推定する
    const isMinor = /^m(?!aj)/.test(suffix);
    const intervals = isMinor ? [0, 3, 7] : [0, 4, 7];
    if (/7/.test(suffix)) {
      intervals.push(/maj7|M7/.test(suffix) ? 11 : 10);
    }
    return intervals;
  }

  function midisForFrets(frets) {
    return frets.map((fret, index) => OPEN_STRING_MIDIS[index] + fret);
  }

  function frequenciesForFrets(frets) {
    return midisForFrets(frets)
      .slice()
      .sort((a, b) => a - b)
      .map((midi) => 440 * Math.pow(2, (midi - 69) / 12));
  }

  // 4本の弦をすべて鳴らして、コードの構成音だけが出る押さえ方を探す。
  // 5音以上のコード（9thなど）は、5度を省略した形も正解として扱う。
  function searchCandidates(chordName) {
    const parsed = parseChordName(chordName);
    if (!parsed) {
      return [];
    }
    const pitchClasses = new Set(
      intervalsForSuffix(parsed.suffix).map((interval) => (parsed.semitone + interval) % 12)
    );
    const required = new Set(pitchClasses);
    if (required.size >= 5) {
      required.delete((parsed.semitone + 7) % 12);
    }

    const candidates = [];
    const frets = [0, 0, 0, 0];
    const walk = (stringIndex) => {
      if (stringIndex === 4) {
        const fretted = frets.filter((fret) => fret > 0);
        if (fretted.length) {
          const span = Math.max(...fretted) - Math.min(...fretted);
          if (span > MAX_SPAN) {
            return;
          }
        }
        const sounded = new Set();
        for (let index = 0; index < 4; index += 1) {
          sounded.add((OPEN_STRING_MIDIS[index] + frets[index]) % 12);
        }
        for (const pc of sounded) {
          if (!pitchClasses.has(pc)) {
            return;
          }
        }
        for (const pc of required) {
          if (!sounded.has(pc)) {
            return;
          }
        }
        const maxFret = Math.max(...frets);
        const minFretted = fretted.length ? Math.min(...fretted) : 0;
        const span = fretted.length ? Math.max(...fretted) - minFretted : 0;
        const sum = frets.reduce((total, fret) => total + fret, 0);
        // 3本以上を同じフレットで押さえる形はセーハ（バレー）なので少し不利にする
        const barre = minFretted > 0 && frets.filter((fret) => fret === minFretted).length >= 3 ? 1.5 : 0;
        // ローポジションでコンパクト、押さえやすい形ほど良いスコア（小さいほど優先）
        candidates.push({ frets: frets.slice(), score: maxFret + span * 1.5 + sum * 0.05 + barre });
        return;
      }
      for (let fret = 0; fret <= MAX_FRET; fret += 1) {
        frets[stringIndex] = fret;
        walk(stringIndex + 1);
      }
    };
    walk(0);
    candidates.sort((a, b) => a.score - b.score);
    return candidates;
  }

  function voicingKey(frets) {
    return midisForFrets(frets)
      .slice()
      .sort((a, b) => a - b)
      .join(",");
  }

  function fretsKey(frets) {
    return frets.join(",");
  }

  function bassPitchClass(frets) {
    return Math.min(...midisForFrets(frets)) % 12;
  }

  function positionOf(frets) {
    const fretted = frets.filter((fret) => fret > 0);
    return fretted.length ? Math.min(...fretted) : 0;
  }

  function fretText(frets) {
    return frets.some((fret) => fret >= 10) ? frets.join("-") : frets.join("");
  }

  function parseBaseFrets(baseFrets) {
    if (Array.isArray(baseFrets) && baseFrets.length === 4) {
      const frets = baseFrets.map((fret) => Number(fret));
      return frets.every((fret) => Number.isInteger(fret) && fret >= 0 && fret <= MAX_FRET) ? frets : null;
    }
    if (typeof baseFrets === "string" && /^\d{4}$/.test(baseFrets)) {
      return baseFrets.split("").map((digit) => Number(digit));
    }
    return null;
  }

  function buildForm(chordName, frets, index) {
    const fretted = frets.filter((fret) => fret > 0);
    return {
      name: String(chordName || "").split("/")[0].trim(),
      frets: frets.slice(),
      label: index === 0 ? "基本形" : `展開形${index}`,
      shortLabel: index === 0 ? "基本" : `展開${index}`,
      fretText: fretText(frets),
      position: fretted.length ? Math.min(...fretted) : 0,
      midis: midisForFrets(frets),
      frequencies: frequenciesForFrets(frets)
    };
  }

  const formsCache = new Map();

  // コード名から「基本形＋展開形」のリストを返す。
  // baseFrets（図鑑データの ukulele_fingering）を渡すと、その形を必ず基本形にする。
  function formsForChord(chordName, options = {}) {
    const name = String(chordName || "").split("/")[0].trim();
    if (!name) {
      return [];
    }
    const base = parseBaseFrets(options.baseFrets);
    const cacheKey = `${name}|${base ? base.join(",") : ""}`;
    if (formsCache.has(cacheKey)) {
      return formsCache.get(cacheKey);
    }

    const candidates = searchCandidates(name);
    const selected = [];
    const usedFrets = new Set();
    const usedVoicings = new Set();
    const usedBassPcs = new Set();
    const accept = (frets) => {
      selected.push(frets);
      usedFrets.add(fretsKey(frets));
      usedVoicings.add(voicingKey(frets));
      usedBassPcs.add(bassPitchClass(frets));
    };
    const isDuplicate = (frets) => usedFrets.has(fretsKey(frets)) || usedVoicings.has(voicingKey(frets));

    if (base) {
      accept(base);
    } else if (candidates.length) {
      accept(candidates[0].frets);
    }

    // 1st パス: 転回形（いちばん低い音＝ベース音が変わる形）を優先して集める
    for (const candidate of candidates) {
      if (selected.length >= MAX_FORMS) {
        break;
      }
      if (isDuplicate(candidate.frets) || usedBassPcs.has(bassPitchClass(candidate.frets))) {
        continue;
      }
      accept(candidate.frets);
    }

    // 2nd パス: まだ枠が余っていたら、さらに上のポジションの形を足す
    if (selected.length < MAX_FORMS) {
      const byPosition = candidates
        .slice()
        .sort((a, b) => positionOf(a.frets) - positionOf(b.frets) || a.score - b.score);
      let highestPosition = Math.max(...selected.map((frets) => positionOf(frets)));
      for (const candidate of byPosition) {
        if (selected.length >= MAX_FORMS) {
          break;
        }
        if (isDuplicate(candidate.frets) || positionOf(candidate.frets) < highestPosition + HIGHER_POSITION_STEP) {
          continue;
        }
        accept(candidate.frets);
        highestPosition = positionOf(candidate.frets);
      }
    }

    // 基本形を先頭に、展開形はネックの下から上への順に並べる
    const alternatives = selected.slice(1).sort((a, b) => positionOf(a) - positionOf(b) || Math.max(...a) - Math.max(...b));
    const ordered = selected.length ? [selected[0], ...alternatives] : [];
    const forms = ordered.map((frets, index) => buildForm(name, frets, index));
    formsCache.set(cacheKey, forms);
    return forms;
  }

  function escapeXml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // 既存の運指アセット（assets/app/fingering/**.svg）と同じ見た目で描く。
  // 5フレットに収まらない形は、表示窓をずらして左端に開始フレット番号を出す。
  function fingeringSvg(chordName, frets) {
    const name = String(chordName || "").split("/")[0].trim();
    const maxFret = Math.max(...frets);
    const windowStart = maxFret <= 5 ? 1 : maxFret - 4;
    const stringXs = [54, 98, 142, 186];
    const fretLines = [];
    for (let row = 0; row <= 5; row += 1) {
      const y = 82 + row * 38;
      fretLines.push(`<line x1="42" y1="${y}" x2="198" y2="${y}"/>`);
    }
    const openMarks = [];
    const dots = [];
    const dotNumbers = [];
    frets.forEach((fret, index) => {
      const x = stringXs[index];
      if (fret === 0) {
        openMarks.push(`<circle cx="${x}" cy="69" r="9" fill="#FFFFFF" stroke="#263238" stroke-width="3"/>`);
        return;
      }
      const y = 63 + (fret - windowStart + 1) * 38;
      dots.push(`<circle cx="${x}" cy="${y}" r="15" fill="#1E5AA8" stroke="#FFFFFF" stroke-width="5"/>`);
      dotNumbers.push(`<text x="${x}" y="${y + 5}">${fret}</text>`);
    });
    const nut = windowStart === 1
      ? `<line x1="42" y1="82" x2="198" y2="82" stroke="#263238" stroke-width="6" stroke-linecap="round"/>`
      : `<text x="24" y="106" text-anchor="middle" font-family="Hiragino Sans, Arial, sans-serif" font-size="13" font-weight="700" fill="#5A6870">${windowStart}</text>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="320" viewBox="0 0 240 320" role="img" aria-label="${escapeXml(name)} ukulele fingering, vertical strings">
  <rect width="240" height="320" rx="18" fill="#FFFFFF"/>
  <text x="120" y="34" text-anchor="middle" font-family="Hiragino Sans, Arial, sans-serif" font-size="28" font-weight="700" fill="#1E5AA8">${escapeXml(name)}</text>
  <text x="120" y="58" text-anchor="middle" font-family="Hiragino Sans, Arial, sans-serif" font-size="12" font-weight="600" fill="#5A6870">G C E A</text>
  <g stroke="#D8E2E8" stroke-width="3" stroke-linecap="round">
    ${fretLines.join("\n    ")}
  </g>
  ${nut}
  <g stroke="#263238" stroke-width="4" stroke-linecap="round">
    ${stringXs.map((x) => `<line x1="${x}" y1="82" x2="${x}" y2="272"/>`).join("\n    ")}
  </g>
  <g font-family="Hiragino Sans, Arial, sans-serif" font-size="12" font-weight="700" fill="#5A6870" text-anchor="middle">
    ${stringXs.map((x, index) => `<text x="${x}" y="291">${STRING_LABELS[index]}</text>`).join("\n    ")}
  </g>
  ${openMarks.join("")}${dots.join("")}
  <g font-family="Hiragino Sans, Arial, sans-serif" font-size="13" font-weight="700" fill="#FFFFFF" text-anchor="middle">
    ${dotNumbers.join("\n    ")}
  </g>
  <text x="120" y="312" text-anchor="middle" font-family="Hiragino Sans, Arial, sans-serif" font-size="13" font-weight="600" fill="#5A6870">${escapeXml(fretText(frets))}</text>
</svg>`;
  }

  function fingeringDataUri(chordName, frets) {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(fingeringSvg(chordName, frets))}`;
  }

  const api = {
    formsForChord,
    fingeringSvg,
    fingeringDataUri
  };

  if (typeof window !== "undefined") {
    window.CodoriChordForms = api;
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})();
