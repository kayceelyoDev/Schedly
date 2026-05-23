export const generateCaption = (title: string, currentCaption: string = ''): string => {
  const t = title.toLowerCase();
  
  // Base tags
  const baseTags = ['#fyp', '#techph', '#shopwithshei'];
  let tagsToAdd = new Set(baseTags);

  if (t.includes('keyboard') || t.includes('switch')) {
    tagsToAdd.add('#mechanicalkeyboard');
    tagsToAdd.add('#keyboardasmr');
    tagsToAdd.add('#desksetup');
  }

  if (t.includes('mouse') || t.includes('wireless')) {
    tagsToAdd.add('#gamingmouse');
    tagsToAdd.add('#pcgaming');
    tagsToAdd.add('#techunboxing');
  }

  if (t.includes('headset') || t.includes('onikuma') || t.includes('audio')) {
    tagsToAdd.add('#gamingheadset');
    tagsToAdd.add('#audiophile');
    tagsToAdd.add('#gaminggear');
  }

  if (t.includes('rapoo') || t.includes('firewolf')) {
    tagsToAdd.add('#budgettech');
    tagsToAdd.add('#gamingperipherals');
  }

  // Combine current caption with new tags, avoiding duplicates
  const existingTags = currentCaption.match(/#[\w]+/g) || [];
  existingTags.forEach(tag => tagsToAdd.add(tag));

  // If there's text in the caption that's not a tag, preserve it
  let pureText = currentCaption.replace(/#[\w]+/g, '').trim();
  
  const finalTagsStr = Array.from(tagsToAdd).join(' ');
  return pureText ? `${pureText}\n\n${finalTagsStr}` : finalTagsStr;
};
