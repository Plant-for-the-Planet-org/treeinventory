import React, { useContext, useEffect, useState, useRef } from 'react';
import { View, StyleSheet, ScrollView, FlatList, Modal, PermissionsAndroid, ImageBackground, Text, Platform, Alert } from 'react-native';
import { Header, LargeButton, PrimaryButton, Label, LabelAccordian, InventoryCard } from '../Common';
import { SafeAreaView } from 'react-native';
import { store } from '../../Actions/store';
import { getInventory, statusToPending, updateLastScreen, updatePlantingDate, addSpeciesAction } from '../../Actions'
import MapboxGL from '@react-native-mapbox-gl/maps';
import RNFetchBlob from 'rn-fetch-blob';
import { marker_png, plus_icon, two_trees } from '../../assets';
import { APLHABETS } from '../../Utils'
import { bugsnag } from '../../Utils'
import DateTimePicker from '@react-native-community/datetimepicker';
import DateTimePickerModal from "react-native-modal-datetime-picker";

import { Colors, Typography } from '_styles';
import { SelectSpecies } from '../../Components';
import { SvgXml } from 'react-native-svg';
import { TouchableOpacity } from 'react-native-gesture-handler';
import moment from "moment";

const InventoryOverview = ({ navigation, }) => {

    const cameraRef = useRef()

    const { state } = useContext(store);

    const [inventory, setInventory] = useState(null)
    const [locationTitle, setlocationTitle] = useState('')
    const [selectedLOC, setSelectedLOC] = useState(null)
    const [isLOCModalOpen, setIsLOCModalOpen] = useState(false)
    const [showDate, setShowDate] = useState(false);
    const [isShowSpeciesListModal, setIsShowSpeciesListModal] = useState(false);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            initiatState()
            let data = { inventory_id: state.inventoryID, last_screen: 'InventoryOverview' }
            updateLastScreen(data)
        });

    }, [])

    const initiatState = () => {
        getInventory({ inventoryID: state.inventoryID }).then((inventory) => {
            inventory.species = Object.values(inventory.species);
            inventory.polygons = Object.values(inventory.polygons);
            setInventory(inventory)
        })
    }

    const renderPolygon = (polygons, locationType) => {
        return (
            <FlatList
                keyboardShouldPersistTaps={'always'}
                data={polygons}
                renderItem={({ item, index }) => {
                    return (<View>
                        <Label leftText={`Location Type: ${locationType}`} rightText={''} />
                        <FlatList
                            data={Object.values(item.coordinates)}
                            renderItem={({ item: oneCoordinate, index }) => {
                                let normalizeData = { title: `Coordinate ${APLHABETS[index]}`, subHeading: `${oneCoordinate.latitude.toFixed(5)}˚N,${oneCoordinate.longitude.toFixed(7)}˚E`, date: 'View location', imageURL: oneCoordinate.imageUrl, index: index }
                                return (<InventoryCard data={normalizeData} activeBtn onPressActiveBtn={onPressViewLOC} />)
                            }}
                        />
                    </View>)
                }}
            />
        )
    }

    const onPressViewLOC = (index) => {
        let selectedCoords = Object.values(inventory.polygons[0].coordinates)[index]
        let normalCoords = [selectedCoords.longitude, selectedCoords.latitude]
        setSelectedLOC(normalCoords)
        setlocationTitle(APLHABETS[index])
        setIsLOCModalOpen(!isLOCModalOpen)
    }

    const onPressSave = () => {
        if (inventory.status == 'incomplete') {
            if (inventory.species.length > 0) {
                let data = { inventory_id: state.inventoryID }
                statusToPending(data).then(() => {
                    navigation.navigate('TreeInventory')
                })
            } else {
                alert('Select atleast one species')
            }
        } else {
            navigation.navigate('TreeInventory')
        }
    }

    const focusMarker = () => {
        cameraRef.current.setCamera({
            centerCoordinate: selectedLOC,
            zoomLevel: 18,
            animationDuration: 2000,
        })
    }

    const onBackPress = () => { // * FOR LOCATION MODAL
        setIsLOCModalOpen(!isLOCModalOpen)
        setSelectedLOC(null)
    }

    const renderViewLOCModal = () => {
        return (
            <Modal transparent visible={isLOCModalOpen} animationType={'slide'}>
                <SafeAreaView />
                <View style={styles.mainContainer}>
                    <View style={styles.screenMargin}>
                        <Header onBackPress={onBackPress} closeIcon headingText={`Location ${locationTitle}`} />
                    </View>
                    <MapboxGL.MapView
                        onDidFinishRenderingMapFully={focusMarker}
                        style={styles.cont}>
                        <MapboxGL.Camera ref={cameraRef} />
                        {selectedLOC && <MapboxGL.PointAnnotation id={`markerContainer1`} coordinate={selectedLOC}>
                            <ImageBackground source={marker_png} style={styles.markerContainer} resizeMode={'cover'}>
                                <Text style={styles.markerText}>{locationTitle}</Text>
                            </ImageBackground>
                        </MapboxGL.PointAnnotation>}
                    </MapboxGL.MapView>
                </View>
            </Modal >
        )
    }

    const askAndroidStoragePermission = async () => {
        return new Promise(async (resolve, reject) => {
            try {
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
                    {
                        title: "Storage Permission",
                        message: "App needs access to memory to download the file ",
                        'buttonPositive': 'Ok'
                    }
                );
                if (granted === PermissionsAndroid.RESULTS.GRANTED) {
                    resolve()
                } else {
                    Alert.alert(
                        "Permission Denied!",
                        "You need to give storage permission to save geoJSON the file"
                    );
                }
            } catch (err) {
                reject()
                bugsnag.notify(err)
            }
        })
    }

    const onPressExportJSON = async () => {
        let exportgeoJSONFile = () => {
            inventory.species = Object.values(inventory.species);
            inventory.polygons = Object.values(inventory.polygons);
            if (inventory.polygons.length > 0) {
                let featureList = inventory.polygons.map((onePolygon) => {
                    return {
                        'type': 'Feature',
                        'properties': {},
                        'geometry': {
                            'type': 'LineString',
                            'coordinates': Object.values(onePolygon.coordinates).map(oneCoordinate => ([oneCoordinate.longitude, oneCoordinate.latitude]))
                        }
                    }
                })
                let geoJSON = {
                    'type': 'FeatureCollection',
                    'features': featureList
                }
                let fileName = `Tree Mapper GeoJSON ${inventory.inventory_id}.json`
                let path = `${Platform.OS == 'ios' ? RNFetchBlob.fs.dirs.DocumentDir : RNFetchBlob.fs.dirs.DownloadDir}/${fileName}`;
                RNFetchBlob.fs.writeFile(path, JSON.stringify(geoJSON), 'utf88')
                    .then((success) => {
                        alert(`GeoJSON file export in ${Platform.OS == 'ios' ? 'document' : 'download'} directory`)
                    }).catch((err) => alert('unable to save file '))
            }
        }
        if (Platform.OS == 'android') {
            askAndroidStoragePermission().then(() => {
                exportgeoJSONFile()
            })
        } else {
            exportgeoJSONFile()
        }

    }

    const renderDatePicker = () => {

        const handleConfirm = (data) => onChangeDate(null, data)
        const hideDatePicker = () => setShowDate(false)

        return (
            showDate && <DateTimePickerModal
                isVisible={showDate}
                maximumDate={new Date()}
                testID="dateTimssePicker"
                timeZoneOffsetInMinutes={0}
                value={new Date(Number(inventory.plantation_date))}
                mode={'date'}
                is24Hour={true}
                display="default"
                onConfirm={handleConfirm}
                onCancel={hideDatePicker}
            />
        )
    }

    const onChangeDate = (event, selectedDate) => {
        setShowDate(false)
        setInventory({ ...inventory, plantation_date: `${selectedDate.getTime()}` });
        updatePlantingDate({ inventory_id: state.inventoryID, plantation_date: `${selectedDate.getTime()}` })
    };

    const renderAddSpeciesButton = (status) => {
        return (status == 'incomplete' && <TouchableOpacity onPress={() => setIsShowSpeciesListModal(true)} style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', backgroundColor: '#F0F0F0', borderRadius: 10, marginVertical: 10 }}>
            <Text style={styles.plantSpeciesText}>{`Planted\nSpecies`}</Text>
            <View style={styles.bannerImgContainer}>
                <SvgXml xml={plus_icon} />
            </View>
            <View style={styles.bannerImgContainer}>
                <SvgXml xml={two_trees} />
            </View>
        </TouchableOpacity>)
    }

    const onPressDate = (status) => {
         status == 'incomplete' && inventory.locate_tree == 'off-site' ? setShowDate(true) : null
    }

    const onPressSaveAndContinue = (SelectSpeciesList) => {
        //  Add it to local Db 
        addSpeciesAction({ inventory_id: state.inventoryID, species: SelectSpeciesList }).then(() => {
            initiatState()
        })
    }

    const renderSelectSpeciesModal = () => {
        const closeSelectSpeciesModal = () => setIsShowSpeciesListModal(false)
        if (inventory) {
            return (<SelectSpecies species={inventory.species} visible={isShowSpeciesListModal} closeSelectSpeciesModal={closeSelectSpeciesModal} onPressSaveAndContinue={onPressSaveAndContinue} />)
        } else {
            return;
        }
    }

    let locationType;
    let isSingleCoordinate, locateType;
    if (inventory) {
        isSingleCoordinate = Object.keys(inventory.polygons[0].coordinates).length == 1;
        locationType = isSingleCoordinate ? 'Single Coordinate' : 'Polygon';
        locateType = inventory.locate_tree == 'off-site' ? 'Off Site' : 'On Site'
    }


    let status = inventory ? inventory.status : 'pending';
    return (
        <SafeAreaView style={styles.mainContainer}>
            {renderViewLOCModal()}
            <View style={styles.container}>
                {inventory !== null ? <View style={styles.cont} >
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps={'always'}>
                        <Header closeIcon headingText={'Review'} subHeadingText={'Trees will be added to your inventory to sync when you have internet.'} />
                        <Label leftText={'Plant Date'} rightText={moment(new Date(Number(inventory.plantation_date))).format('ll')} onPressRightText={() => onPressDate(status)} />
                        {!isSingleCoordinate && <Label leftText={`${locateType} Registration`} rightText={''} />}
                        <Label leftText={`Planted Species`} rightText={status == 'incomplete' ? 'Edit' : ''} onPressRightText={() => setIsShowSpeciesListModal(true)} />
                        <FlatList data={inventory.species} renderItem={({ item }) => (<Label leftText={`${item.nameOfTree}`} rightText={`${item.treeCount} trees`} style={{ marginVertical: 5 }} leftTextStyle={{ paddingLeft: 20, fontWeight: 'normal' }} />)} />
                        {inventory && inventory.species.length <= 0 ? renderAddSpeciesButton(status) : null}
                        {renderPolygon(inventory.polygons, locationType)}
                        <LargeButton onPress={onPressExportJSON} heading={'Export GeoJson'} active={false} medium />
                    </ScrollView>
                    <View>
                        <View style={styles.bottomBtnsContainer}>
                            <PrimaryButton btnText={'Next Tree'} halfWidth theme={'white'} />
                            <PrimaryButton onPress={onPressSave} btnText={'Save'} halfWidth />
                        </View>
                    </View>
                </View> : null}
            </View>
            {renderDatePicker()}
            {renderSelectSpeciesModal()}
        </SafeAreaView>
    )
}
export default InventoryOverview;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 25,
        backgroundColor: Colors.WHITE
    },
    bottomBtnsContainer: {
        flexDirection: 'row', justifyContent: 'space-between'
    },
    cont: {
        flex: 1
    },
    mainContainer: {
        flex: 1, backgroundColor: Colors.WHITE
    },
    markerContainer: {
        width: 30, height: 43, paddingBottom: 85,
    },
    markerText: {
        width: 30, height: 43, color: Colors.WHITE, fontWeight: 'bold', fontSize: 16, textAlign: 'center', paddingTop: 4
    },
    screenMargin: {
        marginHorizontal: 25
    },
    plantSpeciesText: {
        fontFamily: Typography.FONT_FAMILY_REGULAR,
        fontSize: Typography.FONT_SIZE_20,
        lineHeight: Typography.LINE_HEIGHT_24,
        color: Colors.TEXT_COLOR,
        fontWeight: Typography.FONT_WEIGHT_BOLD,
    }

})