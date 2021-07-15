export interface IScientificSpecies {
  guid: string;
  scientificName: string;
  isUserSpecies: boolean;
  isUploaded: boolean;
  specieId?: string;
  aliases: string;
  image: string;
  description: string;
  isUpdated: boolean;
}
