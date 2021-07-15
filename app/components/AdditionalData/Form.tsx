import i18next from 'i18next';
import React, { useContext, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AdditionalDataContext } from '../../reducers/additionalData';
import { Colors, Typography } from '../../styles';
import { AlertModal, InputModal, Loader, PrimaryButton } from '../Common';
import Dropdown from '../Common/Dropdown';
import Page from './Page';

interface IFormProps {
  registrationTypeOptions: any;
  treeTypeOptions: any;
  selectedTreeOption: any;
}

function Form({
  registrationTypeOptions,
  treeTypeOptions,
  selectedTreeOption,
}: IFormProps): JSX.Element {
  const [selectedFormId, setSelectedFormId] = useState<string>('');
  const [selectedPageTitle, setSelectedPageTitle] = useState<string>('');
  const [showAlert, setShowAlert] = useState<boolean>(false);
  const [showInputModal, setShowInputModal] = useState<boolean>(false);
  const [editedPageTitle, setEditedPageTitle] = useState<string>('');

  const {
    deleteElementFromForm,
    filteredForm,
    formLoading: loading,
    setRegistrationType,
    setTreeType,
    addNewForm,
    deleteFormById,
    updateFormData,
    isInitialLoading,
  } = useContext(AdditionalDataContext);

  const resetAlert = () => {
    setShowAlert(false);
    setSelectedFormId('');
    setSelectedPageTitle('');
  };

  const deletePage = () => {
    deleteFormById(selectedFormId);
    resetAlert();
  };

  const handleDeletePress = (formId: string, pageTitle: string) => {
    setSelectedFormId(formId);
    setSelectedPageTitle(pageTitle);
    setShowAlert(true);
  };

  const updatePageTitle = () => {
    updateFormData({ pageTitle: editedPageTitle, formId: selectedFormId });
  };

  const handleShowInputModal = ({ title, formId }: { title: string; formId: string }) => {
    setEditedPageTitle(title);
    setSelectedFormId(formId);
    setShowInputModal(true);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        { flexGrow: 1 },
        loading || isInitialLoading || (Array.isArray(filteredForm) && filteredForm.length > 0)
          ? {}
          : styles.alignCenter,
      ]}
      keyboardShouldPersistTaps="always">
      {loading || isInitialLoading ? (
        <Loader
          isLoaderShow={loading || isInitialLoading}
          loadingText={i18next.t('label.loading_form_editor')}
          isModal={false}
        />
      ) : (
        Array.isArray(filteredForm) &&
        filteredForm.length > 0 && (
          <>
            <View style={styles.formFilterContainer}>
              <Dropdown
                label={i18next.t('label.registrationType')}
                options={registrationTypeOptions}
                onChange={(type: any) => setRegistrationType(type.key)}
                defaultValue={treeTypeOptions[0]}
                editable={true}
                containerStyle={{ marginRight: 16, flex: 1 }}
                backgroundLabelColor={'#f2f2f2'}
                containerBackgroundColor={'#f2f2f2'}
              />
              <Dropdown
                label={i18next.t('label.treeType')}
                options={treeTypeOptions}
                onChange={(type: any) => setTreeType(type.key)}
                defaultValue={registrationTypeOptions[0]}
                editable={true}
                containerStyle={{ flex: 1 }}
                backgroundLabelColor={'#f2f2f2'}
                containerBackgroundColor={'#f2f2f2'}
                selectedOption={selectedTreeOption}
              />
            </View>
            {filteredForm.map((form: any, index: number) => (
              <Page
                pageNo={index + 1}
                title={form.title}
                elements={form.elements}
                key={`form-page-${index}`}
                formId={form.id}
                handleDeletePress={() =>
                  handleDeletePress(
                    form.id,
                    form.title || i18next.t('label.form_page', { pageNo: index + 1 }),
                  )
                }
                formOrder={form.order}
                updateFormElements={(elements: any) =>
                  updateFormData({ elements, formId: form.id })
                }
                deleteElement={(elementIndex: number) =>
                  deleteElementFromForm(form.id, elementIndex)
                }
                updateFormData={updateFormData}
                handleShowInputModal={() =>
                  handleShowInputModal({ title: form.title, formId: form.id })
                }
              />
            ))}
          </>
        )
      )}
      {!loading && !isInitialLoading && Array.isArray(filteredForm) && filteredForm.length === 0 && (
        <>
          <Text style={styles.title}>{i18next.t('label.get_started_forms')}</Text>
          <Text style={styles.desc}>{i18next.t('label.get_started_forms_description')}</Text>
          <PrimaryButton btnText={i18next.t('label.create_form')} onPress={addNewForm} />
        </>
      )}
      <InputModal
        isOpenModal={showInputModal}
        setIsOpenModal={setShowInputModal}
        setValue={setEditedPageTitle}
        value={editedPageTitle}
        onSubmitInputField={updatePageTitle}
        inputType={'text'}
      />
      <AlertModal
        visible={showAlert}
        heading={i18next.t('label.tree_inventory_alert_header')}
        message={i18next.t('label.do_you_want_to_delete_page', { pageTitle: selectedPageTitle })}
        onPressPrimaryBtn={deletePage}
        onPressSecondaryBtn={resetAlert}
        showSecondaryButton
        primaryBtnText={i18next.t('label.tree_review_delete')}
        secondaryBtnText={i18next.t('label.cancel')}
      />
    </ScrollView>
  );
}

export default React.memo(Form);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  alignCenter: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 25,
  },
  formMessageContainer: {
    flex: 1,
    paddingHorizontal: 25,
  },
  title: {
    fontFamily: Typography.FONT_FAMILY_BOLD,
    fontSize: Typography.FONT_SIZE_22,
    color: Colors.TEXT_COLOR,
  },
  desc: {
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    fontSize: Typography.FONT_SIZE_14,
    color: Colors.TEXT_COLOR,
    textAlign: 'left',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 40,
  },
  formFilterContainer: {
    backgroundColor: '#f2f2f2',
    paddingVertical: 12,
    paddingHorizontal: 25,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexShrink: 1,
    height: 80,
  },
});
