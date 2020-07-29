
import Realm from 'realm';
import { bugsnag } from '../Utils/index';
import { MAPBOXGL_ACCCESS_TOKEN } from 'react-native-dotenv';
import Auth0 from 'react-native-auth0';
import { AUTH0_DOMAIN, AUTH0_CLIENT_ID } from 'react-native-dotenv'
import { Coordinates, OfflineMaps, Polygons, User, Species, Inventory } from './Schemas'
import { uploadInventory } from "./UploadInventory";

// AUTH0 CONFIG
const auth0 = new Auth0({ domain: AUTH0_DOMAIN, clientId: AUTH0_CLIENT_ID });


//  ---------------- AUTH0 ACTIONS START----------------

export const auth0Login = () => {
    return new Promise((resolve, reject) => {
        auth0.webAuth
            .authorize({ scope: 'openid email profile' })
            .then(credentials => {
                const { accessToken, idToken } = credentials;
                console.log('accessToken=,', accessToken)
                Realm.open({ schema: [Inventory, Species, Polygons, Coordinates, OfflineMaps, User] })
                    .then(realm => {
                        realm.write(() => {
                            realm.create('User', {
                                id: 'id0001',
                                accessToken: accessToken,
                                idToken: 'NO NEED TO STORE',
                            }, 'modified')
                            resolve(true)
                        })
                    })
            })
            .catch(error => {
                reject(error)
                console.log(error)
            });
    })
}
export const auth0Logout = () => {
    return new Promise((resolve, reject) => {
        auth0.webAuth.clearSession()
            .then(() => {
                alert(23232)
                Realm.open({ schema: [Inventory, Species, Polygons, Coordinates, OfflineMaps, User] })
                    .then(realm => {
                        realm.write(() => {
                            realm.create('User', {
                                id: 'id0001',
                                accessToken: '',
                                idToken: 'NO NEED TO STORE',
                            }, 'modified')
                            resolve(true)
                        })
                    })
            })
            .catch(error => {
                alert('error')
                reject(error)
                console.log(error)
            });
    })
}

export const isLogin = () => {
    return new Promise((resolve, reject) => {
        Realm.open({ schema: [Inventory, Species, Polygons, Coordinates, OfflineMaps, User] })
            .then(realm => {
                const User = realm.objects('User');
                if (Object.keys(User).length > 0) {
                    resolve(true)
                } else {
                    resolve(false)
                }
            })
    })
}

//  ---------------- AUTH0 ACTIONS END----------------

export const getAreaName = ({ coords }) => {
    return new Promise((resolve, reject) => {
        fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${coords[0]},${coords[1]}.json?types=place&access_token=${MAPBOXGL_ACCCESS_TOKEN}`).then((res) => res.json()).then((res) => {
            if (res && res.features && res.features[0]) {
                resolve(res.features[0].place_name)
            } else {
                reject()
            }
        })
    })
}

export const updateSpeceiName = ({ inventory_id, specieText }) => {
    return new Promise((resolve, reject) => {
        Realm.open({ schema: [Inventory, Species, Polygons, Coordinates, OfflineMaps, User] })
            .then(realm => {
                realm.write(() => {
                    let inventory = realm.objectForPrimaryKey('Inventory', `${inventory_id}`)
                    inventory.specei_name = specieText
                })
                resolve()
            }).catch((err) => {
                console.log(err)
                reject(err)
                bugsnag.notify(err)
            });
    })
}

export const updateSpeceiDiameter = ({ inventory_id, speceisDiameter }) => {
    return new Promise((resolve, reject) => {
        Realm.open({ schema: [Inventory, Species, Polygons, Coordinates, OfflineMaps, User] })
            .then(realm => {
                realm.write(() => {
                    let inventory = realm.objectForPrimaryKey('Inventory', `${inventory_id}`)
                    inventory.specei_diameter = speceisDiameter
                })
                resolve()
            }).catch(bugsnag.notify);
    })
}

export const getAllOfflineMaps = () => {
    return new Promise((resolve, reject) => {
        Realm.open({ schema: [Inventory, Species, Polygons, Coordinates, OfflineMaps, User] })
            .then(realm => {
                realm.write(() => {
                    const offlineMaps = realm.objects('OfflineMaps');
                    resolve(JSON.parse(JSON.stringify(offlineMaps)))
                })

            }).catch(bugsnag.notify);
    })
}

export const deleteOfflineMap = ({ name }) => {
    return new Promise((resolve, reject) => {
        Realm.open({ schema: [Inventory, Species, Polygons, Coordinates, OfflineMaps, User] })
            .then(realm => {
                realm.write(() => {
                    const offlineMaps = realm.objectForPrimaryKey('OfflineMaps', `${name}`)
                    realm.delete(offlineMaps)
                    resolve()
                })

            }).catch(bugsnag.notify);
    })
}

export const createOfflineMap = ({ name, size, areaName }) => {
    return new Promise((resolve, reject) => {
        Realm.open({ schema: [Inventory, Species, Polygons, Coordinates, OfflineMaps, User] })
            .then(realm => {
                realm.write(() => {
                    realm.create('OfflineMaps', {
                        name: name,
                        size: size,
                        areaName: areaName
                    })
                    resolve(name)
                })

            }).catch((err) => {
                reject(err)
                bugsnag.notify(err)
            });
    })
}

export const initiateInventory = ({ treeType }) => {
    return new Promise((resolve, reject) => {
        Realm.open({ schema: [Inventory, Species, Polygons, Coordinates, OfflineMaps, User] })
            .then(realm => {
                realm.write(() => {
                    let inventoryID = `${new Date().getTime()}`
                    realm.create('Inventory', {
                        inventory_id: inventoryID,
                        tree_type: treeType,
                        status: 'incomplete',
                        plantation_date: `${new Date().getTime()}`
                    })
                    resolve(inventoryID)
                })

            }).catch(bugsnag.notify);
    })
}

export const updatePlantingDate = ({ inventory_id, plantation_date }) => {
    return new Promise((resolve, reject) => {
        Realm.open({ schema: [Inventory, Species, Polygons, Coordinates, OfflineMaps, User] })
            .then(realm => {
                realm.write(() => {
                    realm.create('Inventory', {
                        inventory_id: `${inventory_id}`,
                        plantation_date
                    }, 'modified')
                    resolve()
                })

            }).catch(bugsnag.notify);
    })
}

export const addSpeciesAction = ({ inventory_id, species, plantation_date }) => {
    return new Promise((resolve, reject) => {
        Realm.open({ schema: [Inventory, Species, Polygons, Coordinates, OfflineMaps, User] })
            .then(realm => {
                realm.write(() => {
                    realm.create('Inventory', {
                        inventory_id: `${inventory_id}`,
                        species,
                        plantation_date
                    }, 'modified')
                    resolve()
                })

            }).catch(bugsnag.notify);
    })
}

export const addLocateTree = ({ locate_tree, inventory_id }) => {
    return new Promise((resolve, reject) => {
        Realm.open({ schema: [Inventory, Species, Polygons, Coordinates, OfflineMaps, User] })
            .then(realm => {
                realm.write(() => {
                    realm.create('Inventory', {
                        inventory_id: `${inventory_id}`,
                        locate_tree
                    }, 'modified')
                    resolve()
                })

            }).catch(bugsnag.notify);
    })
}

export const polygonUpdate = ({ inventory_id }) => {
    return new Promise((resolve, reject) => {
        Realm.open({ schema: [Inventory, Species, Polygons, Coordinates, OfflineMaps, User] })
            .then(realm => {
                realm.write(() => {
                    let inventory = realm.objectForPrimaryKey('Inventory', `${inventory_id}`)
                    inventory.polygons[0].isPolygonComplete = true;
                    resolve()
                })

            }).catch((err) => {
                reject(err)
                bugsnag.notify(err)
            });
    })
}

export const insertImageSingleRegisterTree = ({ inventory_id, imageUrl }) => {
    return new Promise((resolve, reject) => {
        Realm.open({ schema: [Inventory, Species, Polygons, Coordinates, OfflineMaps, User] })
            .then(realm => {
                realm.write(() => {
                    let inventory = realm.objectForPrimaryKey('Inventory', inventory_id)
                    inventory.polygons[0].coordinates[0].imageUrl = imageUrl
                    resolve()
                })

            }).catch((err) => {
                reject(err)
                bugsnag.notify(err)
            });
    })
}

export const addCoordinateSingleRegisterTree = ({ inventory_id, markedCoords, currentCoords, locateTree }) => {
    return new Promise((resolve, reject) => {
        Realm.open({ schema: [Inventory, Species, Polygons, Coordinates, OfflineMaps, User] })
            .then(realm => {
                realm.write(() => {
                    let inventory = realm.objectForPrimaryKey('Inventory', inventory_id)
                    inventory.polygons = [{
                        coordinates: [{
                            latitude: markedCoords[1],
                            longitude: markedCoords[0],
                            currentloclat: currentCoords.latitude,
                            currentloclong: currentCoords.longitude,
                        }]
                    }]
                    inventory.specei_diameter = 10
                    inventory.locate_tree = locateTree
                    inventory.plantation_date = `${Date.now()}`
                    resolve()
                })

            }).catch((err) => {
                reject(err)
                bugsnag.notify(err)
            });
    })
}

export const addCoordinates = ({ inventory_id, geoJSON, currentCoords }) => {
    return new Promise((resolve, reject) => {
        Realm.open({ schema: [Inventory, Species, Polygons, Coordinates, OfflineMaps, User] })
            .then(realm => {
                realm.write(() => {
                    let polygons = []
                    geoJSON.features.map(onePolygon => {
                        let onePolygonTemp = {}
                        onePolygonTemp.isPolygonComplete = onePolygon.properties.isPolygonComplete || false
                        let coordinates = []
                        onePolygon.geometry.coordinates.map((oneLatlong) => {
                            coordinates.push({
                                longitude: oneLatlong[0],
                                latitude: oneLatlong[1],
                                currentloclat: currentCoords.latitude ? currentCoords.latitude : 0,
                                currentloclong: currentCoords.longitude ? currentCoords.longitude : 0
                            })
                        })
                        onePolygonTemp.coordinates = coordinates;
                        polygons.push(onePolygonTemp)
                    })
                    console.log("BEFORE  SAVE GEOJSON=", polygons)
                    realm.create('Inventory', {
                        inventory_id: `${inventory_id}`,
                        polygons: polygons
                    }, 'modified')
                    const oneInvent = realm.objectForPrimaryKey('Inventory', `${inventory_id}`);
                    console.log("AFTER SAVE GEOJSON=", oneInvent.polygons[0].coordinates)
                    resolve()
                })

            }).catch((err) => {
                reject(err)
                bugsnag.notify(err)
            });
    })
}

export const getAllPendingInventory = () => {
    return new Promise((resolve, reject) => {
        Realm.open({ schema: [Inventory, Species, Polygons, Coordinates, OfflineMaps, User] })
            .then(realm => {
                realm.write(() => {
                    const Inventory = realm.objects('Inventory').filtered('status == "pending"');
                    console.log('Inventory')
                    resolve(JSON.parse(JSON.stringify(Inventory)))
                })

            }).catch(bugsnag.notify);
    })
}
export const getAllInventory = () => {
    return new Promise((resolve, reject) => {
        Realm.open({ schema: [Inventory, Species, Polygons, Coordinates, OfflineMaps, User] })
            .then(realm => {
                realm.write(() => {
                    const Inventory = realm.objects('Inventory');
                    resolve(JSON.parse(JSON.stringify(Inventory)))
                })

            }).catch(bugsnag.notify);
    })
}

export const getInventory = ({ inventoryID }) => {
    return new Promise((resolve, reject) => {
        Realm.open({ schema: [Inventory, Species, Polygons, Coordinates, OfflineMaps, User] })
            .then(realm => {
                realm.write(() => {
                    let inventory = realm.objectForPrimaryKey('Inventory', inventoryID)
                    resolve(JSON.parse(JSON.stringify(inventory)))
                })

            }).catch((err) => {
                console.log(err)
                bugsnag.notify(err)
            });
    })
}

export const statusToPending = ({ inventory_id }) => {
    return new Promise((resolve, reject) => {
        Realm.open({ schema: [Inventory, Species, Polygons, Coordinates, OfflineMaps, User] })
            .then(realm => {
                realm.write(() => {
                    realm.create('Inventory', {
                        inventory_id: `${inventory_id}`,
                        status: 'pending'
                    }, 'modified')
                    const Inventory = realm.objects('Inventory');
                    resolve()
                })

            }).catch(bugsnag.notify);
    })
}

export const insertImageAtIndexCoordinate = ({ inventory_id, imageUrl, index }) => {
    return new Promise((resolve, reject) => {
        Realm.open({ schema: [Inventory, Species, Polygons, Coordinates, OfflineMaps, User] })
            .then(realm => {
                realm.write(() => {
                    let inventory = realm.objectForPrimaryKey('Inventory', `${inventory_id}`)
                    let polygons = Object.values(JSON.parse(JSON.stringify(inventory.polygons)));
                    let polygonsTemp = []
                    let coordinatesTemp = []

                    polygonsTemp = polygons.map((onePolygon, i) => {
                        let coords = Object.values(onePolygon.coordinates)
                        coords[index].imageUrl = imageUrl
                        return { isPolygonComplete: onePolygon.isPolygonComplete, coordinates: coords }
                    })
                    inventory.polygons = polygonsTemp;

                    resolve()
                })

            }).catch(bugsnag.notify);
    })
}

export const getCoordByIndex = ({ inventory_id, index, }) => {
    return new Promise((resolve, reject) => {
        Realm.open({ schema: [Inventory, Species, Polygons, Coordinates, OfflineMaps, User] })
            .then(realm => {
                realm.write(() => {
                    let inventory = realm.objectForPrimaryKey('Inventory', `${inventory_id}`)
                    let polygons = Object.values(JSON.parse(JSON.stringify(inventory.polygons)));
                    let coords = Object.values(polygons[0].coordinates)
                    let coordsLength = coords.length
                    resolve({ coordsLength, coord: coords[index] })
                })

            }).catch(bugsnag.notify);
    })
}

export const removeLastCoord = ({ inventory_id }) => {
    return new Promise((resolve, reject) => {
        Realm.open({ schema: [Inventory, Species, Polygons, Coordinates, OfflineMaps, User] })
            .then(realm => {
                realm.write(() => {
                    let inventory = realm.objectForPrimaryKey('Inventory', `${inventory_id}`)
                    let polygons = Object.values(JSON.parse(JSON.stringify(inventory.polygons)));
                    let coords = Object.values(polygons[polygons.length - 1].coordinates)
                    coords = coords.slice(0, coords.length - 1)
                    polygons[polygons.length - 1].coordinates = coords
                    inventory.polygons = polygons;
                    resolve()
                })

            }).catch(bugsnag.notify);

    })
}

export const clearAllInventory = () => {
    return new Promise((resolve, reject) => {
        Realm.open({ schema: [Inventory, Species, Polygons, Coordinates, OfflineMaps, User] })
            .then(realm => {
                realm.write(() => {
                    let allInventory = realm.objects('Inventory').filtered('status == "incomplete"');
                    realm.delete(allInventory);
                    resolve()
                })

            }).catch(bugsnag.notify);

    })
}

export const updateLastScreen = ({ last_screen, inventory_id }) => {
    return new Promise((resolve, reject) => {
        Realm.open({ schema: [Inventory, Species, Polygons, Coordinates, OfflineMaps, User] })
            .then(realm => {
                realm.write(() => {
                    realm.create('Inventory', {
                        inventory_id: `${inventory_id}`,
                        last_screen: last_screen
                    }, 'modified')
                    resolve()
                })
            }).catch(bugsnag.notify);

    })
}

export { uploadInventory }