<script>
import _get from 'lodash/get'
import {
  assignExists,
  getMessage,
  handleValidateErrors,
  jsonParse,
  hasOwnProperty,
} from '@/libs/utils'
import LoadingAction from '@c/LoadingAction'
import LzFormItem from './LzFormItem'

export default {
  name: 'LzForm',
  components: {
    LoadingAction,
    LzFormItem,
  },
  data() {
    return {
      loading: false,
      stay: false,
      /**
       * 备份表单数据，用来重置表单
       */
      formBak: JSON.stringify(this.form),
    }
  },
  props: {
    getData: Function,
    submit: Function,
    errors: {
      type: Object,
      default: () => ({}),
    },
    form: {
      type: Object,
      default: () => ({}),
    },
    submitText: {
      type: String,
      default: '保存',
    },
    inDialog: Boolean,
    createdRedirect: {
      type: [String, Function],
      default() {
        const p = this.$route.path.split('/')
        return '/' + (p[p.length - 2] || '')
      },
    },
    updatedRedirect: {
      type: [String, Function],
      default() {
        return this.$router.back.bind(this.$router)
      },
    },
    disableRedirect: Boolean,
    disableStay: Boolean,
    editMode: {
      type: Boolean,
      default: undefined,
    },
    /**
     * 路由配置中的动态 id 参数
     * 用来自动设置是不是编辑模式
     */
    idField: {
      type: [Number, String],
      default: 'id',
    },
    /**
     * 是否显示表单底部操作栏
     */
    footer: {
      type: Boolean,
      default: true,
    },
    /**
     * 当 input 框聚焦时，按 enter 是否自动提交
     */
    enterToSubmit: Boolean,
  },
  computed: {
    tinyWidth() {
      return this.$store.state.tinyWidth
    },
    realEditMode() {
      return this.editMode === undefined ? !!this.resourceId : this.editMode
    },
    resourceId() {
      return this.$route.params[this.idField]
    },
  },
  methods: {
    async _getData() {
      this.loading = true

      try {
        if (this.getData) {
          const data = await this.getData(this)
          if (data !== undefined) {
            this.$emit('update:form', assignExists(this.form, data))
            this.formBak = JSON.stringify(data)
          }
        }
      } finally {
        this.loading = false
      }
    },
    async onSubmit() {
      this.$emit('update:errors', {})
      try {
        this.submit && await this.submit(this)

        this.$message.success(getMessage(this.realEditMode ? 'updated' : 'created'))

        if (this.stay || this.disableRedirect) {
          return
        }

        const redirect = this.realEditMode ? this.updatedRedirect : this.createdRedirect
        if (typeof redirect === 'string') {
          this.$router.push(redirect)
        } else if (typeof redirect === 'function') {
          redirect()
        }
      } catch (e) {
        const status = _get(e, 'response.status')
        if (status === 422 || status === 429) {
          this.$emit('update:errors', handleValidateErrors(e.response))
        }

        throw e
      }
    },
    onReset() {
      this.$emit('update:form', jsonParse(this.formBak))
      this.$emit('update:errors', {})
    },
    onEnter(e) {
      if (
        this.enterToSubmit &&
        e.target?.tagName.toLowerCase() === 'input' &&
        this.$refs.confirm
      ) {
        this.$refs.confirm.onAction()
      }
    },
  },
  watch: {
    $route: {
      handler() {
        this.$nextTick(() => {
          this.$active && this._getData()
        })
      },
      immediate: true,
    },
  },
  render(h) {
    let defaultSlot = this.$slots.default
    if (Array.isArray(defaultSlot)) {
      defaultSlot = defaultSlot.map((formItem) => {
        const options = formItem.componentOptions
        const props = options.propsData

        const error = this.errors[props.prop]
        if (error) {
          options.propsData.help = error
          options.propsData.validateStatus = 'error'
        }

        if (this.realEditMode && hasOwnProperty(props, 'requiredWhenEdit')) {
          props.required = true
        }

        if (!this.realEditMode && hasOwnProperty(props, 'requiredWhenCreate')) {
          props.required = true
        }

        return formItem
      })
    }

    const stayCheckbox = !this.disableStay && (
      <a-tooltip placement="topRight">
        <span slot="title">表单提交后，留在此页</span>
        <a-checkbox class="stay" vModel={this.stay}>留在此页</a-checkbox>
      </a-tooltip>
    )

    // 如果没有指定布局，并且是在弹框中，则默认为 vertical
    if (this.inDialog && !hasOwnProperty(this.$attrs, 'layout')) {
      this.$attrs.layout = 'vertical'
    }

    const colSpan = this.$attrs.layout === 'vertical'
      ? {}
      : {
        labelCol: Object.assign({ span: 5 }, this.$attrs['label-col']),
        wrapperCol: Object.assign({ span: 19 }, this.$attrs['wrapper-col']),
      }

    const footerSlot = this.$slots.footer || (this.footer && (
      <lz-form-item
        wrapperCol={{
          offset: this.tinyWidth ? 0 : (colSpan?.labelCol?.span || 0),
          span: colSpan?.wrapperCol?.span || 24,
        }}
        class="actions"
      >
        <loading-action ref="confirm" type="primary" action={this.onSubmit}>{this.submitText}</loading-action>
        <a-button class="ml-1" vOn:click={this.onReset}>重置</a-button>
        {this.$slots.footerAppend}
        <div class="flex-spacer"/>
        {stayCheckbox}
      </lz-form-item>
    ))

    return (
      <a-spin
        spinning={this.loading}
        size="large"
        style={{ width: this.inDialog ? 'auto' : '800px' }}
      >
        <a-form
          ref="form"
          {...{
            attrs: Object.assign({}, this.$attrs, colSpan),
            listeners: this.$listeners,
          }}
          class={{ 'in-dialog': this.inDialog }}
          v-on:keydown_enter_native={this.onEnter}
        >
          {[defaultSlot, footerSlot]}
        </a-form>
      </a-spin>
    )
  },
}
</script>

<style scoped lang="less">
.actions {
  ::v-deep .ant-form-item-children {
    display: flex;
  }
}

.stay {
  line-height: 32px;
}

.in-dialog {
  .actions {
    margin-bottom: 0;
  }
}
</style>
