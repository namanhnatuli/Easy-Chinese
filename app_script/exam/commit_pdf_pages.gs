function commitParsedPdfPagesToExamSheets() {
  const pageSheet = getSheet_(CONFIG.SHEET_PDF_PAGES);
  const lastRow = pageSheet.getLastRow();

  if (lastRow < 2) return;

  for (let row = 2; row <= lastRow; row++) {
    const values = pageSheet.getRange(row, 1, 1, 11).getValues()[0];

    const examSetId = safeString_(values[0]);
    const status = safeString_(values[7]);
    const rawJson = safeString_(values[8]);

    if (status !== 'done' || !rawJson) continue;

    const parsed = JSON.parse(rawJson);
    commitParsedPage_(examSetId, parsed);

    pageSheet.getRange(row, 8).setValue('committed');
    pageSheet.getRange(row, 11).setValue(now_());
  }
}

function commitParsedPage_(examSetId, parsed) {
  const sectionType = safeString_(parsed.section?.section_type);
  if (sectionType === 'meta') return;

  const sectionId = `${examSetId}_${sectionType}`;
  const groupId = `${examSetId}_${parsed.part_key}`;

  const group = parsed.group || {};

  upsertRowByFirstColumn_(CONFIG.SHEET_QUESTION_GROUPS, groupId, [
    groupId,
    sectionId,
    examSetId,
    group.group_order || '',
    parsed.part_key || '',
    group.question_from || '',
    group.question_to || '',
    group.question_type || '',
    '',
    '',
    group.instruction || ''
  ]);

  const groupOptions = Array.isArray(parsed.group_options) ? parsed.group_options : [];

  groupOptions.forEach(opt => {
    const optionId = `${groupId}_${opt.option_key}`;

    upsertRowByFirstColumn_(CONFIG.SHEET_OPTIONS, optionId, [
      optionId,
      '',
      groupId,
      opt.option_key || '',
      opt.option_order || '',
      opt.option_type || '',
      opt.text_zh || '',
      opt.pinyin || '',
      opt.text_vi || '',
      '',
      false
    ]);
  });

  const questions = Array.isArray(parsed.questions) ? parsed.questions : [];

  questions.forEach(q => {
    const questionId = `${examSetId}_q${q.question_no}`;

    upsertRowByFirstColumn_(CONFIG.SHEET_QUESTIONS, questionId, [
      questionId,
      groupId,
      sectionId,
      examSetId,
      q.question_no || '',
      q.question_no || '',
      q.question_type || group.question_type || '',
      q.question_text_zh || '',
      q.question_text_pinyin || '',
      q.question_text_vi || '',
      q.stem_text || '',
      q.answer_key || '',
      '',
      'active'
    ]);

    const options = Array.isArray(q.options) ? q.options : [];

    options.forEach(opt => {
      const optionId = `${questionId}_${opt.option_key}`;

      const assetId = opt.option_type === 'image'
        ? `${questionId}_${opt.option_key}_img`
        : '';

      upsertRowByFirstColumn_(CONFIG.SHEET_OPTIONS, optionId, [
        optionId,
        questionId,
        '',
        opt.option_key || '',
        opt.option_order || '',
        opt.option_type || '',
        opt.text_zh || '',
        opt.pinyin || '',
        opt.text_vi || '',
        assetId,
        false
      ]);

      if (assetId) {
        upsertRowByFirstColumn_(CONFIG.SHEET_ASSETS, assetId, [
          assetId,
          'option',
          optionId,
          'image',
          'manual_or_supabase',
          '',
          '',
          opt.asset_hint || '',
          '',
          opt.option_order || ''
        ]);
      }
    });
  });

  const assets = Array.isArray(parsed.assets) ? parsed.assets : [];

  assets.forEach((asset, index) => {
    const assetId = `${examSetId}_${parsed.part_key}_${asset.asset_key || index + 1}`;

    upsertRowByFirstColumn_(CONFIG.SHEET_ASSETS, assetId, [
      assetId,
      asset.owner_type || '',
      asset.owner_ref || '',
      asset.asset_type || '',
      'manual_or_supabase',
      '',
      '',
      asset.asset_hint || '',
      '',
      index + 1
    ]);
  });
}