import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const source = await fs.readFile(path.join(root, 'src/constants/gameData.jsx'), 'utf8');
const data = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const entries = map => Object.entries(map).map(([name, image]) => ({ name, image }));
const utils = await fs.readFile(path.join(root, 'src/utils/gameUtils.js'), 'utf8');
const problems = name => {
  const body = utils.match(new RegExp(`const ${name} = \\[([\\s\\S]*?)\\];`))[1];
  return [...body.matchAll(/question: '([^']+)', answer: '([^']+)'/g)].map(m => ({question:m[1] + ' = ?', answer:m[2]}));
};
const catalog = {
  skills: data.SKILL_DATA,
  themes: data.THEMES_LIST.map(t => ({...t, logo:data.THEME_CONFIG[t.id].assets.logo || data.THEME_CONFIG.minecraft.assets.logo, names:data.SKILL_DATA.map(s=>data.THEME_CONFIG[t.id].skills[s.id].name)})),
  hostile: entries(data.HOSTILE_MOBS), friendly: entries(data.FRIENDLY_MOBS), bosses: entries(data.BOSS_MOBS), minibosses: entries(data.MINIBOSS_MOBS),
  chests: entries(data.CHEST_BLOCKS), axolotls: entries(data.BASE_ASSETS.axolotls), badges: entries(data.BASE_ASSETS.badges),
  reading: Array.from({length:7}, (_,i)=> i===6 ? data.FUNNY_LONG_WORDS : data.READING_WORDS[i+3]),
  writing: Array.from({length:7}, (_,i)=>data.WRITING_DIFFICULTY_POOLS[Math.min(i+1,5)]),
  math: Array.from({length:7}, (_,i)=>data.DIFFICULTY_CONTENT.math[i+1]),
  memory: Array.from({length:7}, (_,i)=>data.DIFFICULTY_CONTENT.memory[i+1]),
  homophones: Object.entries(data.HOMOPHONES).map(([word, alternatives])=>({word, alternatives})),
  pemdas: problems('pemdasProblems'), nightmare: problems('nightmareProblems'),
};
const playlists = [['calm1','calm2','calm3'],['piano3','calm3'],['calm1','piano1'],['piano1','piano2'],['piano1','piano2','piano3'],['calm2','calm3','piano2']];
catalog.themes.forEach((theme, i) => { theme.music = playlists[i].map(track => 'assets/sounds/bgm/' + track + '.wav'); });
for (const mob of [...catalog.hostile,...catalog.bosses,...catalog.minibosses,...catalog.friendly]) {
  const folder = ({Enderman:'endermen','Wither Skeleton':'wither_skeleton'})[mob.name] || mob.name.toLowerCase().replaceAll(' ','');
  for (const event of ['hurt','death']) {
    const file = `assets/sounds/mob/mob/${folder}/${event}.wav`;
    mob[event] = await fs.access(path.join(root,'public',file)).then(()=>file,()=> '');
  }
}
const referenced = new Set();
function collect(value) {
  if (typeof value === 'string' && value.startsWith('assets/')) referenced.add(value);
  else if (value && typeof value === 'object') Object.values(value).forEach(collect);
}
collect(catalog);
for (const file of referenced) await fs.access(path.join(root,'public',file));
const globalSource = await fs.readFile(path.join(root, 'src/components/ui/GlobalStyles.jsx'), 'utf8');
const originalCss = globalSource.slice(globalSource.indexOf('<style>{`')+9, globalSource.lastIndexOf('`}</style>'));
const [css, js] = await Promise.all(['game.css','client.js'].map(f=>fs.readFile(path.join(root,'ow/web',f),'utf8')));
const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Level Up! — OW</title><style>${originalCss}\n${css}</style></head><body><div id="game"><p class="startup">Loading Level Up…</p></div><div id="connection" role="status"></div><script>${js}</script></body></html>`;
await fs.mkdir(path.join(root,'ow/generated'), {recursive:true});
await fs.writeFile(path.join(root,'ow/generated/catalog.json'), JSON.stringify(catalog));
await fs.writeFile(path.join(root,'ow/generated/page.json'), JSON.stringify(page));
console.log(`OW catalog and browser transport built; ${referenced.size} original media references verified.`);
