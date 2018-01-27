/**
 * @module components/navbar/Controller
 */
import Mn from 'backbone.marionette';
import _ from 'underscore';
import Radio from 'backbone.radio';
import View from './View';
import deb from 'debug';

const log = deb('lav:components/navbar/Controller');

/**
 * Navbar controller.
 *
 * @class
 * @extends Marionette.Object
 * @license MPL-2.0
 */
export default class Controller extends Mn.Object {

    /**
     * Radio channel (components/navbar)
     *
     * @returns {Object}
     */
    get channel() {
        return Radio.channel('components/navbar');
    }

    /**
     * App configs.
     *
     * @returns {Object}
     */
    get configs() {
        return Radio.request('collections/Configs', 'findConfigs');
    }

    /**
     * @listens this.channel#show
     */
    constructor(...args) {
        super(...args);

        this.channel.reply({
            show: this.onShowRequest,
        }, this);
    }

    onDestroy() {
        this.notebooks.removeEvents();
    }

    /**
     * Either instantiate the view or just change navbar title.
     *
     * @param {Object} options = {}
     * @returns {Promise}
     */
    onShowRequest(options = {}) {
        if (this.view && this.view._isRendered) {
            return this.changeTitle(options);
        }

        return this.init(options);
    }

    /**
     * Change document and navbar title. View must be rendered before calling
     * this method.
     *
     * @param {Object} options
     * @returns {Promise}
     */
    changeTitle(options) {
        return this.changeDocumentTitle(options)
        .then(titleOptions => {
            this.view.triggerMethod('change:title', {titleOptions});
        });
    }

    /**
     * Fetch data and show the left navbar.
     *
     * @param {Object} options
     * @returns {Promise}
     */
    init(options) {
        this.options = _.extend({}, options);

        return this.fetch()
        .then(() => this.show())
        .then(() => this.listenToEvents())
        .catch(err => log('error', err));
    }

    /**
     * Fetch configs, notebooks...
     *
     * @returns {Promise}
     */
    fetch() {
        const options = {conditions: {trash: 0}};

        return Promise.all([
            Radio.request('collections/Notebooks', 'find', options),
            this.changeDocumentTitle(this.options),
        ])
        .then(res => {
            this.notebooks = res[0];
            this.options.titleOptions = res[1];
        });
    }

    /**
     * Change document title.
     *
     * @param {Object} options = this.options
     * @fires this.view#change:title
     * @returns {Promise}
     */
    changeDocumentTitle(options = this.options) {
        log('change documentTitle', options);
        return Radio.request('utils/Title', 'set', options);
    }

    /**
     * Render the left navbar.
     */
    show() {
        this.view = new View({
            args      : this.options,
            configs   : this.configs,
            notebooks : this.notebooks,
        });

        Radio.request('Layout', 'show', {
            region : 'sidebarNavbar',
            view   : this.view,
        });
    }

    /**
     * Start listening to events.
     */
    listenToEvents() {
        this.notebooks.startListening();
        this.listenTo(this.view, 'submit:search', this.navigateSearch);
    }

    /**
     * Navigate to the search page.
     *
     * @param {Object} data
     * @param {String} data.query - search query text
     */
    navigateSearch(data) {
        const filterArgs = {query: data.query, filter: 'search'};
        Radio.request('utils/Url', 'navigate', {filterArgs});
    }

}

// Instantiate the controller on app init
Radio.once('App', 'init', () => new Controller());
