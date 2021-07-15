export const getNotSampledSpecies = (inventory) => {
  let sampledSpecies = new Set();
  let plantedSpecies = new Set();
  inventory.sampleTrees.forEach((sampleTree) => {
    sampledSpecies.add(sampleTree.specieId);
  });
  inventory.species.forEach((specie) => {
    plantedSpecies.add(specie.id);
  });
  return new Set([...plantedSpecies].filter((i) => !sampledSpecies.has(i)));
};
