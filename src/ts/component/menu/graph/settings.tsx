import * as React from 'react';
import $ from 'jquery';
import { observer } from 'mobx-react';
import { I, S, J, U, keyboard, translate, analytics } from 'Lib';
import { MenuItemVertical, DragHorizontal } from 'Component';

const MenuGraphSettings = observer(class MenuGraphSettings extends React.Component<I.Menu> {

	node = null;
	n = -1;

	constructor (props: I.Menu) {
		super(props);
		
		this.rebind = this.rebind.bind(this);
	};

	render () {
		const { graphDepth } = J.Constant.limit;
		const values = this.getValues();
		const sections = this.getSections();
		const snaps = [];

		for (let i = 1; i <= graphDepth; i++) {
			snaps.push(i / graphDepth);
		};

		const Item = (item: any) => {
			if (item.withDrag) {
				return (
					<div id={`item-${item.id}`} className="item withDrag">
						<div className="flex">
							<div className="name">{item.name}</div>
							<div id={`value-${item.id}`} className="value">{values[item.id]}</div>
						</div>
						<div className="drag">
							<DragHorizontal 
								value={values[item.id] / graphDepth} 
								snaps={snaps}
								strictSnap={true}
								onMove={(e: any, v: number) => this.onDragMove(item.id, v)}
								onEnd={(e: any, v: number) => this.onDragEnd(item.id, v)} 
							/>
						</div>
					</div>
				);
			} else {
				return (
					<MenuItemVertical 
						{...item} 
						onMouseEnter={e => this.onMouseEnter(e, item)} 
						onClick={e => this.onSwitch(item.id)} 
					/>
				);
			};
		};

		const Section = (item: any) => (
			<div className="section">
				{item.name ? <div className="name">{item.name}</div> : ''}
				<div className="items">
					{item.children.map((item: any, i: number) => <Item key={i} {...item} />)}
				</div>
			</div>
		);

		return (
			<div ref={ref => this.node = ref}>
				{sections.map((item: any, i: number) => (
					<Section key={i} {...item} />
				))}
			</div>
		);
	};

	componentDidMount () {
		this.rebind();
	};

	componentDidUpdate () {
		this.rebind();
	};

	componentWillUnmount () {
		this.unbind();
	};

	rebind () {
		this.unbind();

		$(window).on('keydown.menu', e => this.props.onKeyDown(e));
		window.setTimeout(() => this.props.setActive(), 15);
	};
	
	unbind () {
		$(window).off('keydown.menu');
	};

	onMouseEnter (e: any, item: any) {
		if (!keyboard.isMouseDisabled) {
			this.props.setActive(item);
		};
	};

	onDragMove (id: string, v: number) {
		const node = $(this.node);
		const value = node.find(`#value-${id}`);

		if (id == 'depth') {
			v = this.getDepth(v);
		};

		value.text(v);	
	};

	onDragEnd (id: string, v: number) {
		const values = this.getValues();

		if (id == 'depth') {
			values[id] = this.getDepth(v);
		} else {
			values[id] = v;
		};

		analytics.event('GraphSettings', { id, count: values[id] });
		this.save(values);
	};

	onSwitch (id: string) {
		const values = this.getValues();
		values[id] = !values[id];
		this.save(values);

		analytics.event('GraphSettings', { id });
	};

	save (values: I.GraphSettings) {
		S.Common.graphSet(this.getKey(), values);
		this.forceUpdate();
	};

	getDepth (v: number) {
		return Math.max(1, Math.floor(v * J.Constant.limit.graphDepth));
	};

	getKey () {
		return String(this.props.param.data.storageKey);
	};

	getValues () {
		const ret: any = S.Common.getGraph(this.getKey());

		ret.filterTypes = ret.filterTypes || [];

		return ret;
	};

	getSections (): any[] {
		const { config } = S.Common;
		const { param } = this.props;
		const { data } = param;
		const { allowLocal } = data;
		const values = this.getValues();
		const layouts = U.Object.getGraphSkipLayouts();
		const types = S.Record.getTypes().filter(it => !layouts.includes(it.recommendedLayout));

		let sections: any[] = [
			{ 
				name: translate('commonAppearance'), children: [
					{ id: 'label', name: translate('menuGraphSettingsTitles') },
					{ id: 'marker', name: translate('menuGraphSettingsArrows') },
					{ id: 'icon', name: translate('menuGraphSettingsIcons') },
					{ id: 'preview', name: translate('menuGraphSettingsPreview') },
					{ id: 'cluster', name: translate('menuGraphSettingsCluster') },
				] 
			},
			{ 
				name: translate('menuGraphSettingsShowOnGraph'), children: [
					{ id: 'link', name: translate('menuGraphSettingsLinks') },
					{ id: 'relation', name: translate('menuGraphSettingsRelations') },
					{ id: 'orphan', name: translate('menuGraphSettingsUnlinkedObjects') },
				] 
			},
		];

		if (allowLocal) {
			const children: any[] = [ 
				{ id: 'local', name: translate('menuGraphSettingsLocal') },
			];

			if (values.local) {
				children.push({ id: 'depth', name: translate('menuGraphSettingsDepth'), withDrag: true });
			};

			sections.push({ children });
		};

		if (config.experimental && types.length) {
			sections.push({ name: translate('menuGraphSettingsTypes'), children: types.map(it => ({ ...it, object: it, isType: true })) });
		};

		sections = sections.map(s => {
			s.children = s.children.filter(it => it).map(c => {
				c.withSwitch = true;

				if (c.isType) {
					c.switchValue = !values.filterTypes.includes(c.id);
					c.onSwitch = (e, v) => {
						if (v) {
							values.filterTypes = values.filterTypes.filter(it => it != c.id);
						} else {
							values.filterTypes.push(c.id);
						};
						this.save(values);
					};
				} else {
					c.switchValue = values[c.id];
					c.onSwitch = () => this.onSwitch(c.id);
				};
				return c;
			});
			return s;
		});

		return sections;
	};

	getItems (withSections: boolean) {
		const sections = this.getSections();

		let items = [];
		for (const section of sections) {
			if (withSections) {
				items.push({ id: section.id, name: section.name, isSection: true });
			};
			items = items.concat(section.children);
		};

		return items;
	};

});

export default MenuGraphSettings;