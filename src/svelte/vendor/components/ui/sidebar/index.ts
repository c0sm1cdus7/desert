import Content from "./sidebar-content.svelte";
import GroupContent from "./sidebar-group-content.svelte";
import GroupLabel from "./sidebar-group-label.svelte";
import Group from "./sidebar-group.svelte";
import MenuButton from "./sidebar-menu-button.svelte";
import MenuItem from "./sidebar-menu-item.svelte";
import Menu from "./sidebar-menu.svelte";
import Provider from "./sidebar-provider.svelte";
import Trigger from "./sidebar-trigger.svelte";
import Root from "./sidebar.svelte";
import { useSidebar } from "./context.svelte.js";

export {
	Content,
	Group,
	GroupContent,
	GroupLabel,
	Menu,
	MenuButton,
	MenuItem,
	Provider,
	Root,
	//
	Root as Sidebar,
	Content as SidebarContent,
	Group as SidebarGroup,
	GroupContent as SidebarGroupContent,
	GroupLabel as SidebarGroupLabel,
	Menu as SidebarMenu,
	MenuButton as SidebarMenuButton,
	MenuItem as SidebarMenuItem,
	Provider as SidebarProvider,
	Trigger as SidebarTrigger,
	Trigger,
	useSidebar,
};
