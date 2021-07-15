import { getAllInventoryFromServer } from '../actions/inventory';
import { addInventoryToDB, addSampleTree, getInventoryByStatus } from '../repositories/inventory';
import { SYNCED } from './inventoryConstants';

export const addInventoryFromServer = async () => {
  let exceptSampleTrees: any;
  let allSampleTrees: any;
  let allInventoryFromServer = await getAllInventoryFromServer();
  if (allInventoryFromServer.length !== 0) {
    exceptSampleTrees = allInventoryFromServer[0];
    allSampleTrees = allInventoryFromServer[1];
    getInventoryByStatus([SYNCED])
      .then((allInventory) => {
        for (const inventoryFromServer of exceptSampleTrees) {
          if (allInventory.length === 0) {
            addInventoryToDB(inventoryFromServer);
          } else {
            for (const inventory of allInventory) {
              if (inventoryFromServer.id === inventory.locationId) {
                break;
              } else if (
                inventory.locationId === allInventory[allInventory.length - 1].locationId
              ) {
                addInventoryToDB(inventoryFromServer);
              }
            }
          }
        }
      })
      .then(() => {
        for (const sampleTreeFromServer of allSampleTrees) {
          addSampleTree(sampleTreeFromServer);
        }
      });
  }
};
