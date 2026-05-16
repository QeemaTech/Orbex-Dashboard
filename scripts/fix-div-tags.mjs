import fs from "node:fs"

const closeWrong = "</" + "motion.div>"
const openWrong = "<" + "motion.div"
const closeRight = "</" + "div>"
const openRight = "<" + "motion.div".slice(0, 1) + "motion.div".slice(7) // "<" + "div" -> "<div"

const files = [
  "src/components/settings/KeyValueRowsEditor.tsx",
  "src/components/settings/LocalizedKeyValueRowsEditor.tsx",
]

for (const rel of files) {
  const p = new URL(`../${rel}`, import.meta.url)
  if (!fs.existsSync(p)) continue
  let s = fs.readFileSync(p, "utf8")
  const before = s
  s = s.replaceAll(closeWrong, closeRight)
  s = s.replaceAll(openWrong, "<div")
  if (s !== before) {
    fs.writeFileSync(p, s)
    console.log("fixed", rel)
  }
}
