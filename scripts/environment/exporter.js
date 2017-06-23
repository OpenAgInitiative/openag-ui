import {html, Effects} from 'reflex';
import * as Config from '../../openag-config.json';
import * as Template from '../common/stache';
import {merge, tag, nofx, annotate} from '../common/prelude';
import {classed, toggle} from '../common/attr';
import * as Modal from '../common/modal';
import {cursor} from '../common/cursor';
import {localize} from '../common/lang';
import * as Unknown from '../common/unknown';

const MAX_DATAPOINTS = 5000;

// Actions

export const Configure = origin => ({
  type: 'Configure',
  origin
});

export const TagModal = tag('Modal');

export const Open = TagModal(Modal.Open);
export const Close = TagModal(Modal.Close);

// Model init and update

export const init = () => [
  {
    isOpen: false,
    origin: null
  },
  Effects.none
];

export const update = (model, action) =>
  action.type === 'Modal' ?
  updateModal(model, action.source) :
  action.type === 'Configure' ?
  configure(model, action.origin) :
  Unknown.update(model, action);

const configure = (model, origin) =>
  nofx(merge(model, {
    origin
  }));

const updateModal = cursor({
  update: Modal.update,
  tag: TagModal
});

// View

export const view = (model, address, environmentID) => {
  const sendCloseModal = onCloseModal(address);
  return html.div({
    className: 'modal',
    hidden: toggle(!model.isOpen, 'hidden')
  }, [
    html.div({
      className: 'modal-overlay',
      onTouchStart: sendCloseModal,
      onMouseDown: sendCloseModal
    }),
    html.dialog({
      className: 'modal-main modal-main--menu',
      open: toggle(model.isOpen, 'open')
    }, [
      html.div({
        className: 'panels--main'
      }, [
        html.div({
          className: 'panel--main panel--lv0'
        }, [
          html.header({
            className: 'panel--header'
          }, [
            html.h1({
              className: 'panel--title'
            }, [
              localize('Export CSV')
            ])
          ]),
          html.div({
            className: 'panel--content'
          }, [
            html.ul(
              {
                className: 'menu-list'
              },
              [renderExportAll(model.origin, environmentID)].concat(
                Config.chart.map(config => renderExport(
                  model.origin,
                  environmentID,
                  config.variable,
                  config.title
                  )
                )
              )
            )
          ])
        ])
      ])
    ])
  ])
}

const onCloseModal = annotate(Modal.onClose, TagModal);

const renderExport = (origin, environmentID, variable, title) =>
  html.li(null, [
    html.a({
      download: `${variable}.csv`,
      href: templateCsvUrl(origin, environmentID, variable)
    }, [
      title
    ])
  ]);

const renderExportAll = (origin, environmentID) =>
  html.li(null, [
    html.a({
      download: "all_vars.csv",
      href: templateCsvUrlAll(origin, environmentID)
    }, [
      "All Variables"
      ]
    )
  ]);

const templateCsvUrl = (origin, environmentID, variable) =>
  Template.render(Config.environmental_data_point.origin_by_variable_csv, {
    origin_url: origin,
    startkey: JSON.stringify([environmentID, 'measured', variable, {}]),
    endkey: JSON.stringify([environmentID, 'measured', variable]),
    limit: MAX_DATAPOINTS,
    group_level: 4,
    descending: true
  });

const templateCsvUrlAll = (origin, environmentID) =>
  Template.render(Config.environmental_data_point.origin_all_csv, {
    origin_url: origin,
    limit: MAX_DATAPOINTS,
    descending: true
  });
