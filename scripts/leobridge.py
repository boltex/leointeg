import leo.core.leoBridge as leoBridge

controller = leoBridge.controller(gui='nullGui',
                                  loadPlugins=True,  # True: attempt to load plugins.
                                  readSettings=True,  # True: read standard settings files.
                                  silent=False,      # True: don't print signon messages.
                                  verbose=False)     # True: print informational messages.

g = controller.globals()

print("test")
print(dir(g))
