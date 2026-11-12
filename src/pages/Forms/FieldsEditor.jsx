import {
  Box,
  Button,
  Chip,
  IconButton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import {
  ArrowDown,
  ArrowUp,
  PencilSimple,
  Plus,
  Trash,
} from '@phosphor-icons/react';
import { useState } from 'react';
import { CHOICE_TYPES, REQUIREMENTS } from '../../constants/formFields.js';
import { fieldTypeLabels, requirementLabels } from '../../data/formLabels.js';
import { formPageContent as content } from '../../data/formPage.js';
import {
  groupBySection,
  moveWithinSection,
  toFieldInput,
} from '../../utils/formEditor.js';
import FieldDialog from './FieldDialog.jsx';

function fieldDetail(field) {
  const { detail } = content.fields;
  if (field.fieldType === 'number') {
    return detail.number(field.unit, field.decimalPlaces);
  }
  if (field.fieldType === 'scale') {
    return detail.scale(field.scaleMin, field.scaleMax);
  }
  if (CHOICE_TYPES.includes(field.fieldType)) {
    return detail.options(field.options);
  }
  return null;
}

function FieldRow({
  field,
  editable,
  first,
  last,
  onChange,
  onEdit,
  onMove,
  onRemove,
}) {
  const detail = fieldDetail(field);
  return (
    <Box
      component="li"
      sx={{
        py: 1.5,
        borderBottom: 1,
        borderColor: 'divider',
        '&:last-of-type': { borderBottom: 0 },
        display: 'flex',
        flexWrap: 'wrap',
        gap: 1,
        alignItems: 'center',
        justifyContent: 'space-between',
        opacity: field.requirement === 'disabled' ? 0.7 : 1,
      }}
    >
      <Box sx={{ minWidth: 0, flex: '1 1 200px' }}>
        <Typography variant="body2" sx={{ fontWeight: 650 }}>
          {field.name}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {[fieldTypeLabels[field.fieldType], detail]
            .filter(Boolean)
            .join(' · ')}
        </Typography>
      </Box>
      {editable ? (
        <Stack
          direction="row"
          sx={{ flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}
        >
          <ToggleButtonGroup
            exclusive
            size="small"
            value={field.requirement}
            aria-label={content.fields.requirementLabel(field.name)}
            onChange={(_, value) => {
              if (value) {
                onChange({ ...field, requirement: value });
              }
            }}
          >
            {REQUIREMENTS.map((requirement) => (
              <ToggleButton key={requirement} value={requirement}>
                {requirementLabels[requirement]}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <IconButton
            aria-label={content.fields.moveUp(field.name)}
            disabled={first}
            onClick={() => onMove(-1)}
          >
            <ArrowUp aria-hidden="true" size={18} />
          </IconButton>
          <IconButton
            aria-label={content.fields.moveDown(field.name)}
            disabled={last}
            onClick={() => onMove(1)}
          >
            <ArrowDown aria-hidden="true" size={18} />
          </IconButton>
          <IconButton
            aria-label={content.fields.edit(field.name)}
            onClick={onEdit}
          >
            <PencilSimple aria-hidden="true" size={18} />
          </IconButton>
          <IconButton
            aria-label={content.fields.remove(field.name)}
            onClick={onRemove}
          >
            <Trash aria-hidden="true" size={18} />
          </IconButton>
        </Stack>
      ) : (
        <Chip
          size="small"
          variant="outlined"
          label={requirementLabels[field.requirement]}
        />
      )}
    </Box>
  );
}

let nextUid = 0;

/**
 * Campos do formulário agrupados pela seção, como as abas da Figura 39. Com
 * `editable`, cada campo muda de obrigatoriedade, sobe, desce, é editado e
 * removido, e um campo novo entra pelo diálogo. `items` são os campos no
 * formato da API, com um `uid` local.
 */
export default function FieldsEditor({ items, onItemsChange, editable }) {
  // `null`: diálogo fechado; `{ uid: null }`: campo novo.
  const [editing, setEditing] = useState(null);
  const sections = [
    ...new Set(items.map((item) => item.section).filter(Boolean)),
  ];

  function replace(uid, field) {
    onItemsChange(
      items.map((item) => (item.uid === uid ? { ...field, uid } : item)),
    );
  }

  function apply(field) {
    if (editing.uid) {
      replace(editing.uid, field);
    } else {
      nextUid += 1;
      onItemsChange([...items, { ...field, uid: `novo-${nextUid}` }]);
    }
    setEditing(null);
  }

  const groups = groupBySection(items);

  return (
    <Stack spacing={2}>
      {items.length === 0 ? (
        <Typography color="text.secondary">{content.fields.empty}</Typography>
      ) : null}
      {groups.map((group) => (
        <Box key={group.section ?? ''} component="section">
          <Typography variant="h3" sx={{ mb: 0.5 }}>
            {group.section ?? content.fields.noSection}
          </Typography>
          <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none' }}>
            {group.items.map((field, index) => (
              <FieldRow
                key={field.uid}
                field={field}
                editable={editable}
                first={index === 0}
                last={index === group.items.length - 1}
                onChange={(changed) => replace(field.uid, changed)}
                onEdit={() => setEditing(field)}
                onMove={(delta) =>
                  onItemsChange(moveWithinSection(items, field.uid, delta))
                }
                onRemove={() =>
                  onItemsChange(items.filter((item) => item.uid !== field.uid))
                }
              />
            ))}
          </Box>
        </Box>
      ))}
      {editable ? (
        <Box>
          <Button
            variant="outlined"
            startIcon={<Plus aria-hidden="true" />}
            onClick={() => setEditing({ uid: null })}
          >
            {content.fields.add}
          </Button>
        </Box>
      ) : null}
      {editing ? (
        <FieldDialog
          open
          field={editing.uid ? editing : null}
          others={items
            .filter((item) => item.uid !== editing.uid)
            .map(toFieldInput)}
          sections={sections}
          onApply={apply}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </Stack>
  );
}
